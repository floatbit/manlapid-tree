<?php
$name='manlapid_person_photos_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);$root=sys_get_temp_dir().'/'.$name;putenv('KINFOLK_UPLOAD_ROOT='.$root);
require __DIR__.'/../server/database.php';$db=null;
function checkPersonPhoto($value,$message){if(!$value)throw new RuntimeException($message);}
try{
 $db=familyDatabase();foreach(['one','two'] as $id)$db->prepare("INSERT INTO family_people(id,name,photo,bio,location) VALUES (?,?,'','','')")->execute([$id,$id]);
 $image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
 checkPersonPhoto(cleanHeadshotCrop(['zoom'=>10,'x'=>0.5,'y'=>0.5])['zoom']===10.0,'Maximum 10x zoom accepted');
 $crop=cleanHeadshotCrop(['zoom'=>2.3,'x'=>0.25,'y'=>0.8]);
 $db->prepare('UPDATE family_people SET headshot_crop=? WHERE id=?')->execute([json_encode($crop),'one']);
 checkPersonPhoto(json_decode($db->query("SELECT headshot_crop FROM family_people WHERE id='one'")->fetchColumn(),true)===$crop,'Crop settings round trip');
 foreach([['zoom'=>11,'x'=>0.5,'y'=>0.5],['zoom'=>1,'x'=>-1,'y'=>0.5],['zoom'=>1,'x'=>0.5],['zoom'=>'2','x'=>0,'y'=>0]] as $bad){try{cleanHeadshotCrop($bad);throw new RuntimeException('Expected invalid crop rejection');}catch(InvalidArgumentException $e){}}
 $original=storeImage($image,'people','one',true);
 $db->prepare('UPDATE family_people SET headshot_original=? WHERE id=?')->execute([$original,'one']);
 checkPersonPhoto(file_get_contents(imageFilePath($original))===base64_decode(explode(',',$image)[1]),'Original bytes preserved');
 checkPersonPhoto(photoTags($db)===[]&&familyAlbums($db)===[],'Original is not tagged or put in albums');
 storePersonPhotos($db,'two',[$image]);$photo=array_key_first(photoTags($db));
 setPersonPhotoPin($db,'two',$photo,true);setPersonPhotoPin($db,'two',$photo,true);
 checkPersonPhoto(personPhotoPins($db)===['two'=>[$photo]],'Pin persisted and duplicate pin idempotent');
 try{setPersonPhotoPin($db,'one',$photo,true);throw new RuntimeException('Expected rejection');}catch(InvalidArgumentException $e){}
 syncFamilyMedia($db,[['id'=>'one','photo'=>''],['id'=>'two','photo'=>'']],[]);
 checkPersonPhoto(personPhotoPins($db)===['two'=>[$photo]],'Profile saves retain pins');
 checkPersonPhoto($db->query("SELECT headshot_original FROM family_people WHERE id='one'")->fetchColumn()===$original,'Original retained');
 setPersonPhotoPin($db,'two',$photo,false);checkPersonPhoto(personPhotoPins($db)===[],'Unpin persisted');
 echo "Passed: original headshot bytes and isolation, independent personal photos, persisted pins, validation and unpin.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");if(is_dir($root)){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $file){if($file->isDir())rmdir($file->getPathname());else unlink($file->getPathname());}rmdir($root);}}
