<?php
$name='manlapid_captions_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);$root=sys_get_temp_dir().'/'.$name;putenv('KINFOLK_UPLOAD_ROOT='.$root);
require __DIR__.'/../server/database.php';$db=null;
function captionCheck($value,$message){if(!$value)throw new RuntimeException($message);}
try{
 $db=familyDatabase();$image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
 storeAlbum($db,cleanAlbum($db,['id'=>'a','title'=>'Album','photos'=>[$image]]));$path=familyAlbums($db)[0]['photos'][0];
 savePhotoCaption($db,$path,'  Christmas together  ');captionCheck(photoCaptions($db)[$path]==='Christmas together','Caption saves and trims');
 reconcileMediaRows($db,[['album','a',$path,0],['album','b',$path,0]]);
 $captions=$db->query("SELECT caption FROM family_media WHERE file_path=".$db->quote($path))->fetchAll(PDO::FETCH_COLUMN);captionCheck(count($captions)===2&&count(array_unique($captions))===1,'New attachments inherit shared captions');
 savePhotoCaption($db,$path,'A shared memory');captionCheck(count(array_filter($db->query('SELECT caption FROM family_media')->fetchAll(PDO::FETCH_COLUMN),fn($c)=>$c==='A shared memory'))===2,'All appearances share one caption');
 saveAlbumPhotoCaptions($db,'a',[['index'=>0,'caption'=>'Caption from album editor']]);captionCheck(photoCaptions($db)[$path]==='Caption from album editor','Album caption index resolves to saved photo');
 foreach([str_repeat('a',2001),[],null] as $bad){try{savePhotoCaption($db,$path,$bad);throw new RuntimeException('Expected caption rejection');}catch(InvalidArgumentException $e){}}
 try{savePhotoCaption($db,'uploads/missing.jpg','No');throw new RuntimeException('Expected missing photo rejection');}catch(InvalidArgumentException $e){}
 $db->exec("INSERT INTO family_people(id,name,photo,bio,location) VALUES ('p','Portrait','','','')");$portrait=storeImage($image,'people','p');syncFamilyMedia($db,[['id'=>'p','photo'=>$portrait]],[]);
 try{savePhotoCaption($db,$portrait,'No');throw new RuntimeException('Expected headshot rejection');}catch(InvalidArgumentException $e){}
 savePhotoCaption($db,$path,'0');captionCheck(photoCaptions($db)[$path]==='0','A single zero is a valid caption');
 savePhotoCaption($db,$path,'');captionCheck(!isset(photoCaptions($db)[$path]),'Clearing removes caption everywhere');
 importPhotoCaptions($db,[['type'=>'album','owner'=>'a','index'=>0,'fingerprint'=>basename($path),'caption'=>'Restored']]);captionCheck(photoCaptions($db)[$path]==='Restored','Backup captions restore');
 importPhotoCaptions($db,[['type'=>'album','owner'=>'a','index'=>0,'fingerprint'=>basename($path),'caption'=>'Older']]);captionCheck(photoCaptions($db)[$path]==='Restored','Restore preserves newer captions');
 savePhotoCaption($db,$path,'');importPhotoCaptions($db,[['type'=>'album','owner'=>'a','index'=>0,'fingerprint'=>'wrong.png','caption'=>'Wrong']]);captionCheck(!isset(photoCaptions($db)[$path]),'Mismatched backup photo is ignored');
 echo "Passed: shared caption persistence, album indexing, metadata inheritance, validation, headshot exclusion, clearing and backup restoration.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");if(is_dir($root)){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $file){if($file->isDir())rmdir($file->getPathname());else unlink($file->getPathname());}rmdir($root);}}
