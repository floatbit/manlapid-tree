<?php
require_once __DIR__.'/images.php';
function mediaUuid(): string {
    $b=random_bytes(16);$b[6]=chr((ord($b[6])&15)|64);$b[8]=chr((ord($b[8])&63)|128);$h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
}
function familyMediaRows(PDO $db): array {
    return $db->query('SELECT * FROM family_media ORDER BY owner_type,owner_id,display_order,id')->fetchAll();
}
/** Reconcile attachments without replacing stable IDs or editorial metadata. No files are deleted. */
function syncFamilyMedia(PDO $db,array $people,array $milestones): void {
    $wanted=[];foreach($people as $p)if($p['photo']!=='')$wanted[]=['person',$p['id'],$p['photo'],0];
    $overridden=[];foreach($milestones as $event){$albumId=$event['albumId']??$event['album_id']??null;if($albumId)$overridden[$albumId]=true;foreach($event['photos'] as $position=>$path)$wanted[]=[$albumId?'album':'milestone',$albumId?:$event['id'],$path,$position];}
    foreach(familyMediaRows($db) as $row)if($row['owner_type']==='recipe'||($row['owner_type']==='album'&&!isset($overridden[$row['owner_id']])))$wanted[]=[$row['owner_type'],$row['owner_id'],$row['file_path'],(int)$row['display_order']];
    reconcileMediaRows($db,$wanted);
}
function syncAlbumMedia(PDO $db,string $albumId,array $photos): void {
    $wanted=[];foreach(familyMediaRows($db) as $row)if(!($row['owner_type']==='album'&&$row['owner_id']===$albumId))$wanted[]=[$row['owner_type'],$row['owner_id'],$row['file_path'],(int)$row['display_order']];
    foreach($photos as $position=>$path)$wanted[]=['album',$albumId,$path,$position];reconcileMediaRows($db,$wanted);
}
function reconcileMediaRows(PDO $db,array $wanted): void {
    $existing=familyMediaRows($db);$pools=[];
    foreach($existing as $row)$pools[$row['owner_type']][$row['owner_id']][$row['file_path']][]=$row;
    $insert=$db->prepare('INSERT INTO family_media (id,owner_type,owner_id,file_path,media_type,mime_type,byte_size,width,height,display_order) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $reorder=$db->prepare('UPDATE family_media SET display_order=? WHERE id=?');$kept=[];
    foreach($wanted as [$type,$owner,$path,$position]){
        $pool=&$pools[$type][$owner][$path];$old=$pool?array_shift($pool):null;unset($pool);
        if($old){$kept[$old['id']]=true;if((int)$old['display_order']!==$position)$reorder->execute([$position,$old['id']]);continue;}
        $file=imageFilePath($path);$mime=null;$bytes=null;$width=null;$height=null;
        if($file&&is_file($file)){$bytes=filesize($file);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file)?:null;if(!preg_match('/\.(mp4|mov)$/i',$path)){$size=@getimagesize($file);if($size){$width=$size[0];$height=$size[1];}}}
        $id=mediaUuid();$insert->execute([$id,$type,$owner,$path,preg_match('/\.(mp4|mov)$/i',$path)?'video':'image',$mime,$bytes,$width,$height,$position]);$kept[$id]=true;
    }
    $remove=$db->prepare('DELETE FROM family_media WHERE id=?');foreach($existing as $row)if(!isset($kept[$row['id']]))$remove->execute([$row['id']]);
}
/** Keep the existing browser payload shape while reading references from the normalized table. */
function hydrateFamilyMedia(PDO $db,array &$people,array &$milestones): void {
    $portraits=[];$albums=[];$legacy=[];
    foreach(familyMediaRows($db) as $row){if($row['owner_type']==='person')$portraits[$row['owner_id']]=$row['file_path'];elseif($row['owner_type']==='album')$albums[$row['owner_id']][]=$row['file_path'];elseif($row['owner_type']==='milestone')$legacy[$row['owner_id']][]=$row['file_path'];}
    foreach($people as &$p)$p['photo']=$portraits[$p['id']]??'';unset($p);
    foreach($milestones as &$event)$event['photos']=($event['albumId']??$event['album_id']??null)?($albums[$event['albumId']??$event['album_id']]??[]):($legacy[$event['id']]??[]);unset($event);
}
function initializeFamilyMedia(PDO $db): void {
    // Owners are intentionally not cascading foreign keys: saves currently replace owner rows.
    $db->exec("CREATE TABLE IF NOT EXISTS family_media (
        id CHAR(36) PRIMARY KEY,
        owner_type ENUM('person','milestone') NOT NULL,
        owner_id VARCHAR(64) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        media_type ENUM('image','video') NOT NULL,
        mime_type VARCHAR(100) NULL,
        byte_size BIGINT UNSIGNED NULL,
        width INT UNSIGNED NULL,
        height INT UNSIGNED NULL,
        display_order INT NOT NULL DEFAULT 0,
        caption TEXT NULL,
        captured_at DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX media_owner (owner_type,owner_id,display_order)
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS family_migrations (migration_key VARCHAR(100) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    if($db->query("SELECT 1 FROM family_migrations WHERE migration_key='media-table-v1'")->fetchColumn())return;
    $db->beginTransaction();
    try{
        $db->query('SELECT revision FROM family_state WHERE id=1 FOR UPDATE')->fetch();
        if($db->query("SELECT 1 FROM family_migrations WHERE migration_key='media-table-v1'")->fetchColumn()){$db->commit();return;}
        $people=$db->query('SELECT * FROM family_people ORDER BY display_order,id')->fetchAll();$milestones=$db->query('SELECT * FROM family_milestones ORDER BY event_date,id')->fetchAll();
        $backup=['people'=>$people,'milestones'=>$milestones,'media'=>familyMediaRows($db)];
        $dir=__DIR__.'/backups';if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Could not prepare media migration backup.');
        $file=$dir.'/media-table-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';
        if(file_put_contents($file,json_encode($backup,JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Could not back up media references.');chmod($file,0600);
        foreach($milestones as &$event)$event['photos']=json_decode($event['photos']??'[]',true,512,JSON_THROW_ON_ERROR)?:[];unset($event);
        syncFamilyMedia($db,$people,$milestones);
        $expected=count(array_filter($people,fn($p)=>$p['photo']!==''))+array_sum(array_map(fn($e)=>count($e['photos']),$milestones));
        if((int)$db->query('SELECT COUNT(*) FROM family_media')->fetchColumn()!==$expected)throw new RuntimeException('Media migration count mismatch.');
        $checkPeople=$people;$checkEvents=$milestones;hydrateFamilyMedia($db,$checkPeople,$checkEvents);
        if(array_column($people,'photo')!==array_column($checkPeople,'photo')||array_column($milestones,'photos')!==array_column($checkEvents,'photos'))throw new RuntimeException('Media migration order mismatch.');
        $db->exec("INSERT INTO family_migrations (migration_key) VALUES ('media-table-v1')");
        $db->exec('UPDATE family_state SET revision=revision+1 WHERE id=1');$db->commit();
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
