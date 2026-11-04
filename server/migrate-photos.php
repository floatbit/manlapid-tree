<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__.'/database.php';require __DIR__.'/images.php';
$db=familyDatabase();$db->beginTransaction();
try {
    $revision=$db->query('SELECT revision FROM family_state WHERE id=1 FOR UPDATE')->fetchColumn();
    $people=$db->query('SELECT id,photo FROM family_people')->fetchAll();
    $events=$db->query('SELECT id,photos FROM family_milestones')->fetchAll();
    $hasImages=false;foreach ($people as $p) if (str_starts_with($p['photo'],'data:image/')) $hasImages=true;
    foreach ($events as $event) foreach (json_decode($event['photos'] ?? '[]',true) ?: [] as $photo) if(str_starts_with($photo,'data:image/')) $hasImages=true;
    if (!$hasImages) { $db->commit();echo "No embedded images need migration. Upload folders are ready for new photos.\n";exit; }
    $folder=__DIR__.'/backups';if(!is_dir($folder)&&!mkdir($folder,0700,true))throw new RuntimeException('Cannot create migration backup.');
    $backup=$folder.'/embedded-images-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(3)).'.json';
    if(file_put_contents($backup,json_encode(['revision'=>$revision,'people'=>$people,'milestones'=>$events],JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Cannot save migration backup.');chmod($backup,0600);
    $count=0;$update=$db->prepare('UPDATE family_people SET photo=? WHERE id=?');
    foreach($people as $p)if(str_starts_with($p['photo'],'data:image/')){$update->execute([storeImage($p['photo'],'people',$p['id']),$p['id']]);$count++;}
    $update=$db->prepare('UPDATE family_milestones SET photos=? WHERE id=?');
    foreach($events as $event){$photos=json_decode($event['photos'] ?? '[]',true) ?: [];$next=[];foreach($photos as $photo){$next[]=storeImage($photo,'milestones',$event['id']);if(str_starts_with($photo,'data:image/'))$count++;}$update->execute([json_encode($next),$event['id']]);}
    $db->exec('UPDATE family_state SET revision=revision+1 WHERE id=1');$db->commit();echo "Migrated $count images to organized upload folders. Original embedded images backed up in server/backups.\n";
} catch(Throwable $error){if($db->inTransaction())$db->rollBack();fwrite(STDERR,$error->getMessage()."\n");exit(1);}
