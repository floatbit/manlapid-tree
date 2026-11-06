<?php
function cleanNicknames($value): array {
    if (!is_array($value) || array_values($value)!==$value || count($value)>20) throw new InvalidArgumentException('Enter up to 20 nicknames.');
    $result=[];$seen=[];
    foreach($value as $name){
        if(!is_string($name) || mb_strlen($name)>120) throw new InvalidArgumentException('Each nickname must be at most 120 characters.');
        $name=trim($name);$key=mb_strtolower($name);
        if($name!==''&&!isset($seen[$key])){$result[]=$name;$seen[$key]=true;}
    }
    return $result;
}
