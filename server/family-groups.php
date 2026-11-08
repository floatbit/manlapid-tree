<?php
function initializeFamilyGroups(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS family_groups (id VARCHAR(64) PRIMARY KEY,name VARCHAR(200) NOT NULL,parents TEXT NOT NULL,children MEDIUMTEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    if(!$db->query("SHOW COLUMNS FROM family_groups LIKE 'album_id'")->fetch())$db->exec('ALTER TABLE family_groups ADD album_id VARCHAR(64) NULL');
    if(!$db->query("SHOW COLUMNS FROM family_groups LIKE 'view_options'")->fetch())$db->exec('ALTER TABLE family_groups ADD view_options TEXT NULL');
}
function cleanFamilyViewOptions($options): array {
    if($options===null)$options=[];
    if(!is_array($options))throw new InvalidArgumentException('Invalid family view.');
    $above=$options['above']??'none';$below=$options['below']??'children';if($below==='none')$below='children';$expanded=$options['expandedChildren']??[];
    if(!in_array($above,['none','parents','all'],true)||!in_array($below,['children','grandchildren','all'],true)||!is_array($expanded)||array_values($expanded)!==$expanded||count($expanded)>5000)throw new InvalidArgumentException('Invalid family view.');
    foreach($expanded as $id)if(!is_string($id))throw new InvalidArgumentException('Invalid expanded child.');
    return ['above'=>$above,'below'=>$below,'expandedChildren'=>$below==='children'?[]:array_values(array_unique($expanded))];
}
function familyGroups(PDO $db): array {
    $known=array_fill_keys($db->query('SELECT id FROM family_people')->fetchAll(PDO::FETCH_COLUMN),true);
    $groups=$db->query("SELECT g.id,g.name,g.parents,g.children,g.view_options,a.id AS albumId,COALESCE((SELECT file_path FROM family_media m WHERE m.owner_type='album' AND m.owner_id=a.id ORDER BY display_order,id LIMIT 1),'') AS cover,(SELECT COUNT(*) FROM family_media m WHERE m.owner_type='album' AND m.owner_id=a.id) AS photoCount FROM family_groups g LEFT JOIN family_albums a ON a.id=g.album_id ORDER BY g.name,g.id")->fetchAll();
    foreach($groups as &$group)foreach(['parents','children'] as $role)$group[$role]=array_values(array_filter(json_decode($group[$role],true)?:[],fn($id)=>isset($known[$id])));
    unset($group);foreach($groups as &$group){$group['photoCount']=(int)$group['photoCount'];$group['viewOptions']=cleanFamilyViewOptions(json_decode($group['view_options']??'null',true));unset($group['view_options']);$group['viewOptions']['expandedChildren']=array_values(array_intersect($group['viewOptions']['expandedChildren'],$group['children']));}unset($group);return $groups;
}
function cleanFamilyGroup(PDO $db,array $group): array {
    $id=$group['id']??'';$name=$group['name']??'';
    if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_-]{1,64}$/',$id)||!is_string($name)||trim($name)===''||mb_strlen($name)>200)throw new InvalidArgumentException('Enter a family name.');
    $known=array_fill_keys($db->query('SELECT id FROM family_people')->fetchAll(PDO::FETCH_COLUMN),true);$seen=[];
    foreach(['parents','children'] as $role){
        $members=$group[$role]??null;
        if(!is_array($members)||array_values($members)!==$members||count($members)>($role==='parents'?2:5000)||($role==='parents'&&!count($members)))throw new InvalidArgumentException('Choose one or two parents and review their children.');
        foreach($members as $member){if(!is_string($member)||!isset($known[$member])||isset($seen[$member]))throw new InvalidArgumentException('Choose distinct people from the directory for each role.');$seen[$member]=true;}
    }
    if(!array_key_exists('viewOptions',$group)){$query=$db->prepare('SELECT view_options FROM family_groups WHERE id=?');$query->execute([$id]);$group['viewOptions']=json_decode($query->fetchColumn()?:'null',true);}
    $view=cleanFamilyViewOptions($group['viewOptions']);$view['expandedChildren']=array_values(array_intersect($view['expandedChildren'],$group['children']));
    $albumId=$group['albumId']??null;
    if(!array_key_exists('albumId',$group)){$q=$db->prepare('SELECT album_id FROM family_groups WHERE id=?');$q->execute([$id]);$albumId=$q->fetchColumn()?:null;}
    if($albumId!==null&&$albumId!==''){
        if(!is_string($albumId))throw new InvalidArgumentException('Invalid family album.');
        $q=$db->prepare('SELECT 1 FROM family_albums WHERE id=?');$q->execute([$albumId]);if(!$q->fetchColumn())throw new InvalidArgumentException('The selected album no longer exists.');
    }
    return ['albumId'=>$albumId?:null,'id'=>$id,'name'=>trim($name),'parents'=>$group['parents'],'children'=>$group['children'],'viewOptions'=>$view];
}
function storeFamilyGroup(PDO $db,array $group): void {
    $db->prepare('INSERT INTO family_groups (id,name,parents,children,view_options,album_id) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),parents=VALUES(parents),children=VALUES(children),view_options=VALUES(view_options),album_id=VALUES(album_id)')->execute([$group['id'],$group['name'],json_encode($group['parents']),json_encode($group['children']),json_encode($group['viewOptions']??cleanFamilyViewOptions(null)),$group['albumId']??null]);
}
