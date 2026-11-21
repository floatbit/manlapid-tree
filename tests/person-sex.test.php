<?php
$name='manlapid_sex_test_'.bin2hex(random_bytes(4));putenv('KINFOLK_DB_DATABASE='.$name);
require __DIR__.'/../server/database.php';
require __DIR__.'/../server/images.php';
require __DIR__.'/../server/ancestry.php';
require __DIR__.'/../server/location-history.php';
require __DIR__.'/../server/nicknames.php';
$source=file_get_contents(__DIR__.'/../api.php');
eval(substr($source,strpos($source,'function field('),strpos($source,"\ntry {")-strpos($source,'function field(')));
function sexCheck($value,$message){if(!$value)throw new RuntimeException($message);}
$base=['id'=>'p','name'=>'Test Person'];
foreach(['male','female',''] as $sex){[$people]=validateFamily(['people'=>[$base+['sex'=>$sex]],'links'=>[]]);sexCheck($people[0]['sex']===$sex,'Valid Sex accepted');}
[$legacy]=validateFamily(['people'=>[$base],'links'=>[]]);sexCheck($legacy[0]['sex']===null,'Omitted field preserves older-client compatibility');
foreach(['other',1] as $bad){try{validateFamily(['people'=>[$base+['sex'=>$bad]],'links'=>[]]);throw new RuntimeException('Expected invalid Sex rejection');}catch(InvalidArgumentException $e){}}
$db=null;
try{
 $db=familyDatabase();$db->exec("INSERT INTO family_people(id,name,photo,bio,location) VALUES ('p','Test Person','','','')");
 sexCheck($db->query("SELECT sex FROM family_people WHERE id='p'")->fetchColumn()==='', 'Existing records default to unrecorded');
 $db->exec("UPDATE family_people SET sex='female' WHERE id='p'");
 $code='$_SERVER["REQUEST_METHOD"]="GET";$_GET=["view"=>"core"];require '.var_export(realpath(__DIR__.'/../api.php'),true).';';
 $process=proc_open([PHP_BINARY,'-r',$code],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
 $output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
 if(proc_close($process)!==0)throw new RuntimeException($error);
 $snapshot=json_decode($output,true,512,JSON_THROW_ON_ERROR);
 sexCheck(($snapshot['people'][0]['sex']??null)==='female','Saved Sex returned in API snapshot');
 echo "Passed: Sex validation, unrecorded defaults, legacy-client compatibility and database/API persistence.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");}
