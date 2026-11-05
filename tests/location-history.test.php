<?php
require __DIR__.'/../server/location-history.php';
function expectInvalid($entries){try{cleanLocationHistory($entries);}catch(InvalidArgumentException $e){return;}throw new Exception('Expected invalid history');}
$entry=['id'=>'home1','date'=>'1980','location'=>'Manila, Philippines','placeId'=>'example-place','lat'=>14.5995,'lng'=>120.9842,'note'=>'Childhood'];
if(cleanLocationHistory(null)!==null||cleanLocationHistory([])!==[])throw new Exception('Missing/empty');
$later=$entry;$later['id']='home2';$later['date']='2014-12-14';$result=cleanLocationHistory([$later,$entry]);if($result[0]['id']!=='home1')throw new Exception('Chronology');
foreach(['2014-02-30','0000','14','2014-13-01'] as $date){$bad=$entry;$bad['date']=$date;expectInvalid([$bad]);}
$bad=$entry;$bad['placeId']='';expectInvalid([$bad]);$bad=$entry;$bad['lat']=91;expectInvalid([$bad]);expectInvalid([$entry,$entry]);
echo "Passed: chronological dates, year-only entries, invalid calendar dates, Google place selection, coordinates, duplicate IDs, and legacy omission.\n";

foreach(['1940','About 1940','Date unknown','1940-02-29'] as $date){if(!validFamilyDate($date))throw new Exception('Valid approximate date rejected');}
foreach(['About 0000','1940-02-30','sometime'] as $date){if(validFamilyDate($date))throw new Exception('Invalid approximate date accepted');}
$approx=$entry;$approx['date']='About 1940';$unknown=$entry;$unknown['id']='undated';$unknown['date']='Date unknown';
if(count(cleanLocationHistory([$approx,$unknown]))!==2)throw new Exception('Approximate history lost');
if(cleanDateDetails(['birth'=>'About 1940','death'=>'Date unknown'])['birth']!=='About 1940')throw new Exception('Date details lost');
echo "Passed: approximate dates and unknown dates survive validation.\n";
