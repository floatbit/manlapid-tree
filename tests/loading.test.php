<?php
$name='manlapid_loading_test_'.bin2hex(random_bytes(4));
putenv('KINFOLK_DB_DATABASE='.$name);
require __DIR__.'/../server/database.php';
$db=null;
function loadingCheck($value,$message){if(!$value)throw new RuntimeException($message);}
function loadingRequest(array $query): array {
    $code='$_SERVER["REQUEST_METHOD"]="GET";$_GET=json_decode('.var_export(json_encode($query),true).',true);require '.var_export(realpath(__DIR__.'/../api.php'),true).';';
    $process=proc_open([PHP_BINARY,'-r',$code],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
    $output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
    if(proc_close($process)!==0)throw new RuntimeException('API request failed: '.$error);
    $result=json_decode($output,true,512,JSON_THROW_ON_ERROR);
    if(isset($result['error']))throw new RuntimeException($result['error']);return $result;
}
try{
    $db=familyDatabase();
    $db->exec("INSERT INTO family_people (id,name,photo,bio,location) VALUES ('p','Test Person','','','')");
    storeAlbum($db,['id'=>'album','title'=>'Test Album','date'=>'','description'=>'','photos'=>[]]);
    storeRecipe($db,cleanRecipe($db,['id'=>'recipe','title'=>'Test Recipe','personId'=>'p','category'=>'main','ingredients'=>'Rice','instructions'=>'Cook']));
    $core=loadingRequest(['view'=>'core']);
    loadingCheck(count($core['people'])===1&&!isset($core['albums'])&&!isset($core['recipes']),'Startup must omit collections');
    $revision=loadingRequest(['view'=>'revision']);
    loadingCheck(array_keys($revision)===['revision']&&is_int($revision['revision']),'Poll must return only the revision');
    $albums=loadingRequest(['view'=>'collections','include'=>'albums']);
    loadingCheck(count($albums['albums'])===1&&!isset($albums['people'])&&!isset($albums['recipes']),'Albums request only returns requested collection');
    $recipes=loadingRequest(['view'=>'collections','include'=>'recipes']);
    loadingCheck(count($recipes['recipes'])===1&&!isset($recipes['albums']),'Recipes load independently');
    $loaded=loadingRequest(['view'=>'core','include'=>'albums']);
    loadingCheck(count($loaded['albums'])===1&&!isset($loaded['recipes']),'Refresh includes only already loaded collections');
    $legacy=loadingRequest([]);
    loadingCheck(count($legacy['albums'])===1&&count($legacy['recipes'])===1,'Existing API clients remain compatible');
    echo "Passed: real API startup, revision-only polls, independent collections, scoped refresh, and legacy compatibility.\n";
}finally{if($db)$db->exec("DROP DATABASE `$name`");}
