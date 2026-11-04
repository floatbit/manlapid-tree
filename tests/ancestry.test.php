<?php
require __DIR__.'/../server/ancestry.php';
$people=array_map(fn($id)=>['id'=>$id,'name'=>$id],['a','b','c','d']);
function checkCase($label,$people,$links,$reject){try{validateAncestry($people,$links);$rejected=false;}catch(InvalidArgumentException $e){$rejected=true;}if($rejected!==$reject)throw new Exception($label);}
$child=fn($a,$b)=>['a'=>$a,'b'=>$b,'type'=>'child'];
$parent=fn($a,$b)=>['a'=>$a,'b'=>$b,'type'=>'parent'];
checkCase('Self ancestor',$people,[$child('a','a')],true);
checkCase('Direct reversal',$people,[$child('a','b'),$child('b','a')],true);
checkCase('Mixed direction cycle',$people,[$child('a','b'),$parent('c','b'),$parent('a','c')],true);
checkCase('Disconnected cycle',$people,[$child('b','c'),$child('c','d'),$child('d','b')],true);
checkCase('Shared ancestors are valid',$people,[$child('a','b'),$child('a','c'),$child('b','d'),$child('c','d')],false);
checkCase('Sibling and spouse cycles are valid',$people,[['a'=>'a','b'=>'b','type'=>'sibling'],['a'=>'b','b'=>'c','type'=>'sibling'],['a'=>'c','b'=>'a','type'=>'spouse']],false);
$many=[];$links=[];for($i=0;$i<5000;$i++){$many[]=['id'=>'p'.$i,'name'=>'P'.$i];if($i)$links[]=$child('p'.($i-1),'p'.$i);}checkCase('Long chain',$many,$links,false);$links[]=$child('p4999','p0');checkCase('Long cycle',$many,$links,true);
echo "Passed: self, direct, mixed-direction, disconnected and long ancestry cycles; valid shared ancestors and non-ancestry loops.\n";
