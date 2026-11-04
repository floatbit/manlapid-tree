<?php
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('memory_limit','768M');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict']);
session_start();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
$csrf = $_SESSION['csrf'];
session_write_close();
function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
require_once __DIR__.'/server/images.php';
require_once __DIR__.'/server/categories.php';
function snapshot(PDO $db, string $csrf): array {
    $state = $db->query('SELECT revision, request_email FROM family_state WHERE id = 1')->fetch();
    $people = $db->query("SELECT id, name, photo, bio, COALESCE(birthday, '') AS birthday, location FROM family_people ORDER BY display_order, id")->fetchAll();
    $links = $db->query('SELECT person_a AS a, person_b AS b, relationship_type AS type FROM family_relationships ORDER BY person_a, person_b')->fetchAll();
    $milestones = $db->query('SELECT id,title,event_type AS type,event_date AS date,description,location,participants,photos FROM family_milestones ORDER BY event_date,id')->fetchAll();
    foreach ($milestones as &$event) { $event['participants'] = json_decode($event['participants'],true) ?: []; $event['photos'] = json_decode($event['photos'] ?? '[]',true) ?: []; }
    unset($event);
    return ['personAliases' => $db->query('SELECT old_id,person_id FROM family_person_aliases')->fetchAll(), 'milestones' => $milestones, 'revision' => (int)$state['revision'], 'people' => $people, 'links' => $links, 'email' => $state['request_email'], 'csrf' => $csrf];
}
function field(array $row, string $key, int $max): string {
    $value = $row[$key] ?? '';
    if (!is_string($value) || mb_strlen($value) > $max) throw new InvalidArgumentException('Invalid ' . $key . '.');
    return $value;
}
function validateFamily(array $body): array {
    $people = $body['people'] ?? null; $links = $body['links'] ?? null;
    if (!is_array($people) || !is_array($links) || count($people) > 5000 || count($links) > 20000) throw new InvalidArgumentException('Invalid family data.');
    $ids = []; $cleanPeople = []; $cleanLinks = []; $pairs = [];
    foreach ($people as $row) {
        if (!is_array($row)) throw new InvalidArgumentException('Invalid person.');
        $id = field($row, 'id', 64); $name = trim(field($row, 'name', 120));
        if (!preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $id) || isset($ids[$id]) || $name === '') throw new InvalidArgumentException('Each person needs a unique ID and a name.');
        $photo = field($row, 'photo', 3500000);
        validateStoredImage($photo,'people',$id);
        $birthday = field($row, 'birthday', 10);
        if ($birthday !== '') { $date = DateTimeImmutable::createFromFormat('!Y-m-d', $birthday); if (!$date || $date->format('Y-m-d') !== $birthday) throw new InvalidArgumentException('Invalid birthday.'); }
        $ids[$id] = true;
        $cleanPeople[] = ['id'=>$id, 'name'=>$name, 'photo'=>$photo, 'bio'=>field($row,'bio',20000), 'birthday'=>$birthday, 'location'=>field($row,'location',255)];
    }
    foreach ($links as $link) {
        if (!is_array($link)) throw new InvalidArgumentException('Invalid connection.');
        $a = field($link,'a',64); $b = field($link,'b',64); $type = field($link,'type',10);
        $pair = [$a,$b]; sort($pair); $key = implode('|',$pair);
        if (!isset($ids[$a],$ids[$b]) || $a === $b || isset($pairs[$key]) || !in_array($type,['parent','child','sibling','spouse'],true)) throw new InvalidArgumentException('Invalid or duplicate family connection.');
        $pairs[$key] = true; $cleanLinks[] = ['a'=>$a,'b'=>$b,'type'=>$type];
    }
    $email = field($body,'email',254);
    if ($email !== '' && !filter_var($email,FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Invalid requests email.');
    $cleanMilestones = null;
    if (array_key_exists('milestones',$body)) {
        if (!is_array($body['milestones']) || count($body['milestones']) > 10000) throw new InvalidArgumentException('Invalid milestones.');
        $cleanMilestones = []; $eventIds = [];
        foreach ($body['milestones'] as $event) {
            if (!is_array($event)) throw new InvalidArgumentException('Invalid milestone.');
            $id = field($event,'id',64); $title = trim(field($event,'title',200)); $type = field($event,'type',20); $date = field($event,'date',10);
            $parsed = DateTimeImmutable::createFromFormat('!Y-m-d',$date);
            if (!preg_match('/^[a-zA-Z0-9_-]{1,64}$/',$id) || isset($eventIds[$id]) || $title === '' || !in_array($type,MILESTONE_CATEGORIES,true) || !$parsed || $parsed->format('Y-m-d') !== $date) throw new InvalidArgumentException('Each milestone needs a unique ID, title, type, and valid date.');
            $participants = $event['participants'] ?? [];
            if (!is_array($participants) || count($participants)>5000) throw new InvalidArgumentException('Invalid milestone participants.');
            foreach ($participants as $participant) if (!is_string($participant) || !isset($ids[$participant])) throw new InvalidArgumentException('A milestone participant is not in the family directory.');
            $photos=$event['photos'] ?? null;
            if ($photos !== null) { if (!is_array($photos)) throw new InvalidArgumentException('Invalid milestone photos.'); foreach ($photos as $photo) { if (!is_string($photo) || strlen($photo)>140000000) throw new InvalidArgumentException('Invalid milestone photo.'); validateStoredImage($photo,'milestones',$id); } }
            $eventIds[$id] = true;
            $cleanMilestones[] = ['id'=>$id,'title'=>$title,'type'=>$type,'date'=>$date,'description'=>field($event,'description',20000),'location'=>field($event,'location',255),'participants'=>array_values(array_unique($participants)),'photos'=>$photos];
        }
    }
    return [$cleanPeople,$cleanLinks,$email,$cleanMilestones];
}
try {
    require __DIR__ . '/server/database.php';
    $db = familyDatabase();
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $db->beginTransaction(); $result = snapshot($db,$csrf); $db->commit(); respond(200,$result);
    }
    if (!in_array($method,['POST','PUT'],true)) { header('Allow: GET, POST, PUT'); respond(405,['error'=>'Method not allowed.']); }
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site' || !hash_equals($csrf, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) respond(403,['error'=>'Reload the page before saving.']);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 160000000) respond(413,['error'=>'This update is too large.']);
    $body = json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR);
    if (!is_array($body) || !in_array($body['action'] ?? '',['save','bootstrap'],true)) throw new InvalidArgumentException('Invalid request.');
    [$people,$links,$email,$milestones] = validateFamily($body);
    $db->beginTransaction();
    $revision = (int)$db->query('SELECT revision FROM family_state WHERE id = 1 FOR UPDATE')->fetchColumn();
    if ($body['action'] === 'bootstrap' && $revision !== 0) {
        $result = snapshot($db,$csrf); $db->commit(); respond(200,$result);
    }
    if ($body['action'] === 'save' && (!isset($body['revision']) || $body['revision'] !== $revision)) {
        $db->rollBack(); respond(409,['error'=>'Another browser changed the family. Reload to get the latest data before saving.']);
    }
    // Older browser versions omit milestones: preserve them during other edits.
    if ($milestones === null) {
        $milestones = $db->query('SELECT id,title,event_type AS type,event_date AS date,description,location,participants,photos FROM family_milestones')->fetchAll();
        $currentIds = array_column($people,'id');
        foreach ($milestones as &$event) { $event['participants'] = array_values(array_intersect(json_decode($event['participants'],true) ?: [],$currentIds)); $event['photos']=json_decode($event['photos'] ?? '[]',true) ?: []; }
        unset($event);
    }
    $savedPhotos=[];foreach ($db->query('SELECT id,photos FROM family_milestones')->fetchAll() as $old) $savedPhotos[$old['id']]=json_decode($old['photos'] ?? '[]',true) ?: [];
    foreach ($people as &$p) $p['photo']=storeImage($p['photo'],'people',$p['id']); unset($p);
    foreach ($milestones as &$event) { if ($event['photos']===null) $event['photos']=$savedPhotos[$event['id']] ?? []; $event['photos']=array_map(fn($photo)=>storeImage($photo,'milestones',$event['id']),$event['photos']); } unset($event);
    $db->exec('DELETE FROM family_relationships');
    $db->exec('DELETE FROM family_people');
    $insert = $db->prepare('INSERT INTO family_people (id,name,photo,bio,birthday,location,display_order) VALUES (?,?,?,?,?,?,?)');
    foreach ($people as $i=>$p) $insert->execute([$p['id'],$p['name'],$p['photo'],$p['bio'],$p['birthday'] ?: null,$p['location'],$i]);
    $insert = $db->prepare('INSERT INTO family_relationships (person_a,person_b,relationship_type) VALUES (?,?,?)');
    foreach ($links as $link) $insert->execute([$link['a'],$link['b'],$link['type']]);
    $db->exec('DELETE FROM family_milestones');
    $insert = $db->prepare('INSERT INTO family_milestones (id,title,event_type,event_date,description,location,participants,photos) VALUES (?,?,?,?,?,?,?,?)');
    foreach ($milestones as $event) $insert->execute([$event['id'],$event['title'],$event['type'],$event['date'],$event['description'],$event['location'],json_encode($event['participants']),json_encode($event['photos'])]);
    $db->prepare('UPDATE family_state SET revision = revision + 1, request_email = ? WHERE id = 1')->execute([$email]);
    $result = snapshot($db,$csrf); $db->commit(); respond(200,$result);
} catch (JsonException | InvalidArgumentException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    respond(422,['error'=>$e instanceof JsonException ? 'Invalid JSON.' : $e->getMessage()]);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    if ($e instanceof RuntimeException && !($e instanceof PDOException)) respond(503,['error'=>$e->getMessage()]);
    respond(503,['error'=>'Cannot connect to the family database. Check that MySQL is running and the server configuration is correct.']);
}
