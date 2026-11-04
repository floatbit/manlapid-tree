<?php
function splitPersonName(string $name): array {
 $parts=preg_split('/\s+/u',trim($name),-1,PREG_SPLIT_NO_EMPTY);
 $first=array_shift($parts) ?? ''; $last=count($parts)?array_pop($parts):'';
 return ['firstName'=>$first,'middleName'=>implode(' ',$parts),'lastName'=>$last];
}
