<?php
$name='manlapid_groups_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);
$root=sys_get_temp_dir().'/'.$name;putenv('KINFOLK_UPLOAD_ROOT='.$root);
require __DIR__.'/../server/database.php';$db=null;
function groupCheck($value,$message){if(!$value)throw new RuntimeException($message);}
try{
 $db=familyDatabase();
 foreach(['parent','other-parent','child','new-child'] as $id)$db->prepare("INSERT INTO family_people (id,name,photo,bio,location) VALUES (?,?,'','','')")->execute([$id,$id]);
 $db->exec("INSERT INTO family_relationships VALUES ('child','parent','parent')");
 $links=$db->query('SELECT * FROM family_relationships')->fetchAll();
 $group=['id'=>'test-family','name'=>'Test Family','parents'=>['parent','other-parent'],'children'=>['child'],'viewOptions'=>cleanFamilyViewOptions(null)];
 storeFamilyGroup($db,cleanFamilyGroup($db,$group));
 groupCheck(array_diff_key(familyGroups($db)[0],array_flip(['albumId','cover','photoCount']))==$group,'Saved family roles round-trip');
 $group['name']='Renamed Family';$group['children'][]='new-child';storeFamilyGroup($db,cleanFamilyGroup($db,$group));
 groupCheck(count(familyGroups($db))===1&&array_diff_key(familyGroups($db)[0],array_flip(['albumId','cover','photoCount']))==$group,'Edits update the same group');
 groupCheck($db->query('SELECT * FROM family_relationships')->fetchAll()===$links,'Groups never modify relationships');
 foreach([['parents',[]],['parents',['parent','other-parent','child']],['children',['parent']],['children',['child','child']],['children',['missing']],['name','']] as [$key,$value]){
  $bad=$group;$bad[$key]=$value;try{cleanFamilyGroup($db,$bad);throw new RuntimeException('Expected validation rejection');}catch(InvalidArgumentException $e){}
 }
 $group['viewOptions']=['above'=>'all','below'=>'grandchildren','expandedChildren'=>['child']];storeFamilyGroup($db,cleanFamilyGroup($db,$group));
 groupCheck(familyGroups($db)[0]['viewOptions']===$group['viewOptions'],'View preferences persist');
 $withoutView=$group;unset($withoutView['viewOptions']);groupCheck(cleanFamilyGroup($db,$withoutView)['viewOptions']===$group['viewOptions'],'Older clients preserve saved view');
 foreach([['above'=>'invalid'],['below'=>'invalid'],['expandedChildren'=>[123]]] as $view){$bad=$group;$bad['viewOptions']=$view;try{cleanFamilyGroup($db,$bad);throw new RuntimeException('Expected invalid view rejection');}catch(InvalidArgumentException $e){}}
 $album=['id'=>'family-album','title'=>'Test Family','date'=>'','description'=>'','photos'=>[]];
 storeAlbum($db,cleanAlbum($db,$album));$group['albumId']=$album['id'];storeFamilyGroup($db,cleanFamilyGroup($db,$group));
 groupCheck(familyGroups($db)[0]['albumId']==='family-album','Family album link persists');
 groupCheck(familyGroups($db)[0]['cover']===''&&familyGroups($db)[0]['photoCount']===0,'Empty family album has no cover');
 $album['photos']=['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='];storeAlbum($db,cleanAlbum($db,$album));
 $cover=familyGroups($db)[0]['cover'];groupCheck(str_starts_with($cover,'uploads/albums/family-album/')&&familyGroups($db)[0]['photoCount']===1,'Album photos supply the family cover and count');
 $db->beginTransaction();try{$bad=$group;$bad['parents']=[];storeAlbum($db,cleanAlbum($db,['id'=>'rollback-album','title'=>'Rollback','date'=>'','description'=>'','photos'=>[]]));storeFamilyGroup($db,cleanFamilyGroup($db,$bad));throw new RuntimeException('Expected rejection');}catch(InvalidArgumentException $e){$db->rollBack();}
 groupCheck(!$db->query("SELECT 1 FROM family_albums WHERE id='rollback-album'")->fetchColumn(),'Invalid family rolls back album creation');
 $withoutAlbum=$group;unset($withoutAlbum['albumId']);groupCheck(cleanFamilyGroup($db,$withoutAlbum)['albumId']==='family-album','Older saves preserve album');
 $bad=$group;$bad['albumId']='missing';try{cleanFamilyGroup($db,$bad);throw new RuntimeException('Expected invalid album rejection');}catch(InvalidArgumentException $e){}
 $db->exec("DELETE FROM family_people WHERE id='new-child'");
 groupCheck(familyGroups($db)[0]['children']===['child'],'Deleted people do not leave broken member references');
 $db->beginTransaction();$db->exec('DELETE FROM family_relationships');$db->exec('DELETE FROM family_people');
 foreach(['parent','other-parent','child'] as $id)$db->prepare("INSERT INTO family_people (id,name,photo,bio,location) VALUES (?,?,'','','')")->execute([$id,$id]);
 $db->commit();groupCheck(familyGroups($db)[0]['parents']===['parent','other-parent'],'Family groups survive existing person replacement saves');
 $db->exec("DELETE FROM family_groups WHERE id='test-family'");groupCheck(!familyGroups($db)&&$db->query('SELECT COUNT(*) FROM family_people')->fetchColumn()==3,'Deleting a group retains people');
 echo "Passed: family group save/edit, role validation, two-generation limit, relationship isolation, person deletion, replacement saves and group deletion.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");if(is_dir($root)){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $file){if($file->isDir())rmdir($file->getPathname());else unlink($file->getPathname());}rmdir($root);}}
