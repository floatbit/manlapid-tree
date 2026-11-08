<?php
$name='manlapid_tags_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);$root=sys_get_temp_dir().'/'.$name;putenv('KINFOLK_UPLOAD_ROOT='.$root);
require __DIR__.'/../server/database.php';$db=null;
function tagCheck($value,$message){if(!$value)throw new RuntimeException($message);}
try{
 $db=familyDatabase();foreach(['one','two'] as $id)$db->prepare("INSERT INTO family_people (id,name,photo,bio,location) VALUES (?,?,'','','')")->execute([$id,$id]);
 $image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
 storeAlbum($db,cleanAlbum($db,['id'=>'album','title'=>'Album','date'=>'','description'=>'','photos'=>[$image]]));
 $path=familyAlbums($db)[0]['photos'][0];
 savePhotoTags($db,$path,['one','two','one']);tagCheck(count(photoTags($db)[$path])===2,'Multiple tags deduplicate');
 syncAlbumMedia($db,'album',[$path]);tagCheck(count(photoTags($db)[$path])===2,'Album updates preserve tags');
 $db->exec("DELETE FROM family_people WHERE id='one'");tagCheck(photoTags($db)[$path]===['two'],'Deleted people hidden');
 $db->prepare("INSERT INTO family_people (id,name,photo,bio,location) VALUES ('one','one','','','')")->execute();tagCheck(count(photoTags($db)[$path])===2,'Replacement person saves retain tags');
 foreach([['unknown'],[1],null] as $bad){try{savePhotoTags($db,$path,$bad);throw new RuntimeException('Expected rejection');}catch(InvalidArgumentException $e){}}
 savePhotoTags($db,$path,[]);tagCheck(!photoTags($db),'Removing all tags persists');
 importPhotoTags($db,[['type'=>'album','owner'=>'album','index'=>0,'fingerprint'=>basename($path),'people'=>['two']]]);tagCheck(photoTags($db)[$path]===['two'],'Backup tags restore to matching photos');
 importPhotoTags($db,[['type'=>'album','owner'=>'album','index'=>0,'fingerprint'=>'different.png','people'=>['one']]]);tagCheck(photoTags($db)[$path]===['two'],'Backup cannot tag a different photo at the same index');
 deleteLightboxPhoto($db,$path);tagCheck(familyAlbums($db)[0]['photos']===[],'Deleting removes photo from its album');tagCheck((int)$db->query('SELECT COUNT(*) FROM family_photo_tags')->fetchColumn()===0,'Removed photos clean tag references');
 echo "Passed: photo tags, validation, album updates, person replacement, backup restoration and photo deletion.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");if(is_dir($root)){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $file){if($file->isDir())rmdir($file->getPathname());else unlink($file->getPathname());}rmdir($root);}}
