<?php
require_once __DIR__.'/media.php';
function attachBirthAlbum(PDO $db,string $personId,string $albumId): void {
    $query=$db->prepare('SELECT 1 FROM family_people WHERE id=?');$query->execute([$personId]);
    if(!$query->fetchColumn())throw new InvalidArgumentException('This person no longer exists.');
    if($albumId!==''){
        $query=$db->prepare('SELECT 1 FROM family_albums WHERE id=?');$query->execute([$albumId]);
        if(!$query->fetchColumn())throw new InvalidArgumentException('This album no longer exists.');
        $query=$db->prepare('SELECT 1 FROM family_milestones WHERE album_id=?');$query->execute([$albumId]);
        $used=$query->fetchColumn();
        $query=$db->prepare('SELECT 1 FROM family_people WHERE birth_album_id=? AND id<>?');$query->execute([$albumId,$personId]);
        if($used||$query->fetchColumn())throw new InvalidArgumentException('This album is already attached to another timeline entry.');
    }
    $db->prepare('UPDATE family_people SET birth_album_id=? WHERE id=?')->execute([$albumId?:null,$personId]);
}
function familyAlbums(PDO $db): array {
    $albums=$db->query("SELECT id,title,COALESCE(album_date,'') AS date,description FROM family_albums ORDER BY album_date DESC,title,id")->fetchAll();$photos=[];
    foreach(familyMediaRows($db) as $row)if($row['owner_type']==='album')$photos[$row['owner_id']][]=$row['file_path'];
    $birthLinks=[];foreach($db->query('SELECT id,birth_album_id FROM family_people WHERE birth_album_id IS NOT NULL')->fetchAll() as $person)$birthLinks[$person['birth_album_id']]=$person['id'];
    $links=[];foreach($db->query('SELECT id,album_id FROM family_milestones WHERE album_id IS NOT NULL')->fetchAll() as $event)$links[$event['album_id']]=$event['id'];
    foreach($albums as &$album){$album['photos']=$photos[$album['id']]??[];$album['milestoneId']=$links[$album['id']]??null;$album['birthPersonId']=$birthLinks[$album['id']]??null;}unset($album);return $albums;
}
function validateAlbumReference(PDO $db,string $path,string $albumId): void {
    if(!str_starts_with($path,'uploads/')){validateStoredImage($path,'albums',$albumId);return;}
    $file=imageFilePath($path);$query=$db->prepare("SELECT 1 FROM family_media WHERE owner_type='album' AND owner_id=? AND file_path=? LIMIT 1");$query->execute([$albumId,$path]);
    if(!$file||!is_file($file)||(!$query->fetchColumn()&&!str_starts_with($path,"uploads/albums/$albumId/")))throw new InvalidArgumentException('This photo does not belong to the selected album.');
}
function validateMilestonePhoto(PDO $db,string $path,string $eventId,string $albumId): void {
    if(str_starts_with($path,'uploads/')&&$albumId!==''){try{validateAlbumReference($db,$path,$albumId);return;}catch(InvalidArgumentException $e){}}
    validateStoredImage($path,'milestones',$eventId);
}
function cleanAlbum(PDO $db,array $row): array {
    $id=$row['id']??'';$title=$row['title']??'';$date=$row['date']??'';$description=$row['description']??'';$photos=$row['photos']??[];
    if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_-]{1,64}$/',$id)||!is_string($title)||!trim($title)||mb_strlen($title)>200||!is_string($description)||mb_strlen($description)>20000||!is_string($date)||!is_array($photos))throw new InvalidArgumentException('Enter a valid album title and photos.');
    if($date!==''){$parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);if(!$parsed||$parsed->format('Y-m-d')!==$date)throw new InvalidArgumentException('Invalid album date.');}
    foreach($photos as $path){if(!is_string($path)||strlen($path)>140000000)throw new InvalidArgumentException('Invalid album media.');validateAlbumReference($db,$path,$id);}
    return ['id'=>$id,'title'=>trim($title),'date'=>$date,'description'=>$description,'photos'=>$photos];
}
function storeAlbum(PDO $db,array $album): void {
    $photos=array_map(fn($path)=>str_starts_with($path,'uploads/')?$path:storeImage($path,'albums',$album['id']),$album['photos']);
    $db->prepare('INSERT INTO family_albums (id,title,album_date,description) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),album_date=VALUES(album_date),description=VALUES(description)')->execute([$album['id'],$album['title'],$album['date']?:null,$album['description']]);
    syncAlbumMedia($db,$album['id'],$photos);
}
function prepareMilestoneAlbums(PDO $db,array &$milestones): void {
    $exists=$db->prepare('SELECT 1 FROM family_albums WHERE id=?');$used=[];
    foreach($milestones as &$event){
        $albumId=$event['albumId']??'';
        if($albumId!==''){$exists->execute([$albumId]);if(!$exists->fetchColumn())throw new InvalidArgumentException('The selected album no longer exists.');}
        elseif(count($event['photos'])){$albumId=mediaUuid();$db->prepare('INSERT INTO family_albums (id,title,album_date,description) VALUES (?,?,?,?)')->execute([$albumId,$event['title'],$event['date'],$event['description']]);}
        if($albumId!==''&&isset($used[$albumId]))throw new InvalidArgumentException('An album can be linked to only one milestone.');
        if($albumId!=='')$used[$albumId]=true;$event['albumId']=$albumId?:null;
    }unset($event);
}
function initializeFamilyAlbums(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS family_albums (id VARCHAR(64) PRIMARY KEY,title VARCHAR(200) NOT NULL,album_date DATE NULL,description TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX album_chronology (album_date)) ENGINE=InnoDB");
    if(!$db->query("SHOW COLUMNS FROM family_milestones LIKE 'album_id'")->fetch())$db->exec('ALTER TABLE family_milestones ADD album_id VARCHAR(64) NULL');
    $type=$db->query("SHOW COLUMNS FROM family_media LIKE 'owner_type'")->fetch();if(!str_contains($type['Type'],"'album'"))$db->exec("ALTER TABLE family_media MODIFY owner_type ENUM('person','milestone','album') NOT NULL");
    if($db->query("SELECT 1 FROM family_migrations WHERE migration_key='milestone-albums-v1'")->fetchColumn())return;
    $db->beginTransaction();try{
        $db->query('SELECT revision FROM family_state WHERE id=1 FOR UPDATE')->fetch();
        if($db->query("SELECT 1 FROM family_migrations WHERE migration_key='milestone-albums-v1'")->fetchColumn()){$db->commit();return;}
        $events=$db->query('SELECT * FROM family_milestones')->fetchAll();$media=familyMediaRows($db);
        $backup=['milestones'=>$events,'media'=>$media,'albums'=>familyAlbums($db)];$file=__DIR__.'/backups/milestone-albums-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';
        if(file_put_contents($file,json_encode($backup,JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Album migration backup failed.');chmod($file,0600);
        $eventMedia=[];foreach($media as $row)if($row['owner_type']==='milestone')$eventMedia[$row['owner_id']][]=$row;
        foreach($events as $event){if(empty($eventMedia[$event['id']]))continue;$id=mediaUuid();$db->prepare('INSERT INTO family_albums (id,title,album_date,description) VALUES (?,?,?,?)')->execute([$id,$event['title'],$event['event_date'],$event['description']]);$db->prepare('UPDATE family_milestones SET album_id=? WHERE id=?')->execute([$id,$event['id']]);$db->prepare("UPDATE family_media SET owner_type='album',owner_id=? WHERE owner_type='milestone' AND owner_id=?")->execute([$id,$event['id']]);
            $check=$db->prepare("SELECT id,file_path,display_order FROM family_media WHERE owner_type='album' AND owner_id=? ORDER BY display_order,id");$check->execute([$id]);$expected=array_map(fn($r)=>array_intersect_key($r,array_flip(['id','file_path','display_order'])),$eventMedia[$event['id']]);if($check->fetchAll()!=$expected)throw new RuntimeException('Album migration verification failed.');
        }
        if(count(familyMediaRows($db))!==count($media))throw new RuntimeException('Album migration media count mismatch.');
        $db->exec("INSERT INTO family_migrations (migration_key) VALUES ('milestone-albums-v1')");$db->exec('UPDATE family_state SET revision=revision+1 WHERE id=1');$db->commit();
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
