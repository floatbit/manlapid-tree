<?php
$name='manlapid_dates_test_'.bin2hex(random_bytes(4));
putenv('KINFOLK_DB_DATABASE='.$name);
require __DIR__.'/../server/database.php';
require_once __DIR__.'/../server/location-history.php';
require_once __DIR__.'/../server/ancestry.php';
$db=null;
try {
 $db=familyDatabase();
 $api=file_get_contents(__DIR__.'/../api.php');
 $start=strpos($api,'function field(');$end=strpos($api,"\ntry {",$start);
 eval(substr($api,$start,$end-$start));
 [$people]=validateFamily(['people'=>[['id'=>'approx-person','name'=>'Test Person','birthday'=>'','dateDetails'=>['birth'=>'About 1940','death'=>'2020','currentSince'=>'Date unknown']]],'links'=>[]]);
 $start=strpos($api,"    \$insert = \$db->prepare('INSERT INTO family_people");
 $end=strpos($api,"\n",strpos($api,'foreach ($people as $i=>$p)',$start));
 eval(substr($api,$start,$end-$start));
 $stored=$db->query("SELECT birthday,date_details FROM family_people WHERE id='approx-person'")->fetch();
 if($stored['birthday']!==null || json_decode($stored['date_details'],true)['birth']!=='About 1940')throw new Exception('Approximate dates did not round-trip');
 echo "Passed: real API validation and insert preserve approximate dates in an isolated MySQL database.\n";
} finally {if($db)$db->exec("DROP DATABASE `$name`");}
