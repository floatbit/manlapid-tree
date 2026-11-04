<?php
function cleanLocationHistory($entries): ?array {
 if($entries===null)return null;
 if(!is_array($entries)||count($entries)>200)throw new InvalidArgumentException('Invalid places lived.');
 $result=[];$seen=[];
 foreach($entries as $entry){
  if(!is_array($entry))throw new InvalidArgumentException('Invalid place lived.');
  $id=$entry['id']??'';$date=$entry['date']??'';$address=$entry['location']??'';$placeId=$entry['placeId']??'';$note=$entry['note']??'';
  foreach([$id,$date,$address,$placeId,$note] as $value)if(!is_string($value))throw new InvalidArgumentException('Invalid place lived.');
  if(!preg_match('/^[a-zA-Z0-9_-]{1,64}$/',$id)||isset($seen[$id])||!trim($address)||strlen($address)>1000||!$placeId||strlen($placeId)>255||mb_strlen($note)>2000)throw new InvalidArgumentException('Choose a Google location for each place lived.');
  $valid=preg_match('/^[0-9]{4}$/',$date)&&$date>='0001';
  if(preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/',$date)){$parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);$valid=$parsed&&$parsed->format('Y-m-d')===$date;}
  if(!$valid)throw new InvalidArgumentException('For each place lived, enter a year (1980) or date (1980-06-15).');
  $lat=$entry['lat']??null;$lng=$entry['lng']??null;
  if(!is_numeric($lat)||!is_numeric($lng)||!is_finite((float)$lat)||!is_finite((float)$lng)||abs((float)$lat)>90||abs((float)$lng)>180)throw new InvalidArgumentException('Choose a Google suggestion for each place lived.');
  $seen[$id]=true;$result[]=['id'=>$id,'date'=>$date,'location'=>trim($address),'placeId'=>$placeId,'lat'=>(float)$lat,'lng'=>(float)$lng,'note'=>$note];
 }
 usort($result,fn($a,$b)=>strcmp($a['date'],$b['date']));return $result;
}

function cleanBirthplace($place): ?array {
 if($place===null)return null;
 if(!is_array($place))throw new InvalidArgumentException('Invalid birthplace.');
 foreach(['location','placeId'] as $key)if(!isset($place[$key])||!is_string($place[$key])||!trim($place[$key])||mb_strlen($place[$key])>255)throw new InvalidArgumentException('Choose a Google suggestion for birthplace.');
 $lat=$place['lat']??null;$lng=$place['lng']??null;
 if(!is_numeric($lat)||!is_numeric($lng)||!is_finite((float)$lat)||!is_finite((float)$lng)||abs((float)$lat)>90||abs((float)$lng)>180)throw new InvalidArgumentException('Invalid birthplace coordinates.');
 return ['location'=>trim($place['location']),'placeId'=>$place['placeId'],'lat'=>(float)$lat,'lng'=>(float)$lng];
}
