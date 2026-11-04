<?php
/** Validate directed parent-to-child edges without recursion or ancestry-depth limits. */
function validateAncestry(array $people, array $links): void {
    $children=[]; $names=[]; $state=[];
    foreach($people as $person){$children[$person['id']]=[];$names[$person['id']]=$person['name'];}
    foreach($links as $link){
        if($link['type']==='parent')$children[$link['b']][]=$link['a'];
        elseif($link['type']==='child')$children[$link['a']][]=$link['b'];
    }
    foreach(array_keys($children) as $root){
        if(isset($state[$root]))continue;
        $state[$root]=1;$stack=[[$root,0]];
        while($stack){
            $top=count($stack)-1;[$id,$next]=$stack[$top];
            if($next>=count($children[$id])){$state[$id]=2;array_pop($stack);continue;}
            $child=$children[$id][$next];$stack[$top][1]++;
            if(($state[$child]??0)===1)throw new InvalidArgumentException('Cannot save these parent/child connections: they would make '.$names[$child].' their own ancestor. Correct the parent/child relationships and try again.');
            if(!isset($state[$child])){$state[$child]=1;$stack[]=[$child,0];}
        }
    }
}
