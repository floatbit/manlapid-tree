<?php
// CLI-only, idempotent conversion of legacy person IDs, retaining shared-link aliases.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__.'/database.php';
require __DIR__.'/images.php';
$db=familyDatabase();$db->beginTransaction();
try {
 $db->query('SELECT revision FROM family_state WHERE id=1 FOR UPDATE')->fetch();
 $tables=['family_people','family_relationships','family_milestones','family_state','family_person_aliases'];$backup=[];
 foreach($tables as $table)$backup[$table]=$db->query("SELECT * FROM $table")->fetchAll();
 $map=[];foreach($backup['family_people'] as $p)if(!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i',$p['id'])){
  $bytes=random_bytes(16);$bytes[6]=chr((ord($bytes[6])&15)|64);$bytes[8]=chr((ord($bytes[8])&63)|128);$hex=bin2hex($bytes);$map[$p['id']]=substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
 }
 if(!$map){$db->rollBack();echo "No legacy person IDs remain.\n";exit;}
 $dir=__DIR__.'/backups';if(!is_dir($dir))mkdir($dir,0700,true);$file=$dir.'/person-ids-'.gmdate('Ymd-His').'.json';if(file_put_contents($file,json_encode($backup,JSON_THROW_ON_ERROR))===false)throw new RuntimeException('Backup failed');chmod($file,0600);
 $insert=$db->prepare('INSERT INTO family_people (id,name,photo,bio,birthday,location,display_order) VALUES (?,?,?,?,?,?,?)');
 $alias=$db->prepare('INSERT INTO family_person_aliases (old_id,person_id) VALUES (?,?)');
 foreach($backup['family_people'] as $p){if(!isset($map[$p['id']]))continue;$old=$p['id'];$id=$map[$old];$photo=$p['photo'];
  if(str_starts_with($photo,"uploads/people/$old/")){$new=str_replace("uploads/people/$old/","uploads/people/$id/",$photo);$target=imageFilePath($new);if(!is_dir(dirname($target)))mkdir(dirname($target),0755,true);if(!copy(imageFilePath($photo),$target))throw new RuntimeException('Portrait copy failed');$photo=$new;}
  $insert->execute([$id,$p['name'],$photo,$p['bio'],$p['birthday'],$p['location'],$p['display_order']]);$alias->execute([$old,$id]);
 }
 $db->exec('DELETE FROM family_relationships');$insert=$db->prepare('INSERT INTO family_relationships VALUES (?,?,?)');foreach($backup['family_relationships'] as $r)$insert->execute([$map[$r['person_a']]??$r['person_a'],$map[$r['person_b']]??$r['person_b'],$r['relationship_type']]);
 $update=$db->prepare('UPDATE family_milestones SET participants=? WHERE id=?');foreach($backup['family_milestones'] as $event){$ids=json_decode($event['participants'],true,512,JSON_THROW_ON_ERROR);$update->execute([json_encode(array_map(fn($id)=>$map[$id]??$id,$ids)),$event['id']]);}
 $delete=$db->prepare('DELETE FROM family_people WHERE id=?');foreach($map as $old=>$id)$delete->execute([$old]);
 $db->exec('UPDATE family_state SET revision=revision+1 WHERE id=1');
 if((int)$db->query('SELECT COUNT(*) FROM family_people')->fetchColumn()!==count($backup['family_people'])||(int)$db->query('SELECT COUNT(*) FROM family_relationships')->fetchColumn()!==count($backup['family_relationships']))throw new RuntimeException('Record count mismatch');
 $db->commit();echo 'Migrated '.count($map)." person IDs; preserved all people and relationships. Backup: $file\n";
} catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
