<?php
// Integration test: always uses a separate disposable database and uploads directory.
$name='manlapid_media_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);
$root=sys_get_temp_dir().'/'.$name;putenv('KINFOLK_UPLOAD_ROOT='.$root);
require __DIR__.'/../server/database.php';
function verify($condition,$message){if(!$condition)throw new RuntimeException($message);}
$db=null;
try{
 $db=familyDatabase();
 $path='uploads/people/person1/2026/11/'.str_repeat('a',64).'.png';$file=imageFilePath($path);mkdir(dirname($file),0755,true);file_put_contents($file,base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='));
 $a='uploads/milestones/event1/2026/11/'.str_repeat('b',64).'.jpg';$b='uploads/milestones/event1/2026/11/'.str_repeat('c',64).'.mp4';
 $db->prepare("INSERT INTO family_people (id,name,photo,bio,location) VALUES ('person1','Example',?,'','')")->execute([$path]);
 $db->prepare("INSERT INTO family_milestones (id,title,event_type,event_date,description,location,participants,photos) VALUES ('event1','Example','other','2026-11-01','','','[]',?)")->execute([json_encode([$a,$b,$a])]);
 $db->exec("DELETE FROM family_migrations WHERE migration_key='media-table-v1'");initializeFamilyMedia($db);
 $rows=familyMediaRows($db);verify(count($rows)===4,'Migration must preserve every occurrence');
 $people=[['id'=>'person1','photo'=>'wrong']];$events=[['id'=>'event1','photos'=>[]]];hydrateFamilyMedia($db,$people,$events);
 verify($people[0]['photo']===$path&&$events[0]['photos']===[$a,$b,$a],'Canonical reads preserve portraits, videos and album order');
 $portrait=array_values(array_filter($rows,fn($r)=>$r['owner_type']==='person'))[0];verify((int)$portrait['width']===1&&$portrait['mime_type']==='image/png','New media file metadata');
 $video=array_values(array_filter($rows,fn($r)=>$r['file_path']===$b))[0];$db->prepare('UPDATE family_media SET caption=? WHERE id=?')->execute(['Remember this',$video['id']]);
 $events[0]['photos']=[$b,$a,$a];$db->beginTransaction();syncFamilyMedia($db,$people,$events);$db->commit();
 $new=familyMediaRows($db);$retained=array_values(array_filter($new,fn($r)=>$r['file_path']===$b))[0];verify($retained['id']===$video['id']&&$retained['caption']==='Remember this'&&(int)$retained['display_order']===0,'Reorder/cover must preserve stable IDs and metadata');
 $beforeIds=array_column($new,'id');syncFamilyMedia($db,$people,$events);verify($beforeIds===array_column(familyMediaRows($db),'id'),'Repeated save is idempotent');
 $db->beginTransaction();syncFamilyMedia($db,[],[]);$db->rollBack();verify(count(familyMediaRows($db))===4,'Rollback restores media');
 syncFamilyMedia($db,$people,[]);verify(count(familyMediaRows($db))===1&&is_file($file),'Deleting an album removes records without deleting files');
 syncFamilyMedia($db,[],[]);verify(!familyMediaRows($db)&&is_file($file),'Deleting a person removes orphan references, retaining file');
 initializeFamilyMedia($db);verify(!familyMediaRows($db),'Completed migration does not reimport stale compatibility columns');
 echo "Passed: migration/order/duplicates, portraits/video, file metadata, stable IDs/captions, covers, repeated saves, rollback, orphan cleanup and file retention.\n";
}finally{
 if($db)$db->exec("DROP DATABASE `$name`");
 if(is_dir($root)){$files=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($files as $file)$file->isDir()?rmdir($file->getPathname()):unlink($file->getPathname());rmdir($root);}
}
