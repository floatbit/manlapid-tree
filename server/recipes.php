<?php
const RECIPE_CATEGORIES=['main'=>'Main dishes','side'=>'Sides','soup'=>'Soups and stews','dessert'=>'Desserts','baking'=>'Baking','breakfast'=>'Breakfast','snack'=>'Snacks','drink'=>'Drinks','other'=>'Other'];
function initializeFamilyRecipes(PDO $db): void {
 $db->exec("CREATE TABLE IF NOT EXISTS family_recipes (id VARCHAR(64) PRIMARY KEY,title VARCHAR(200) NOT NULL,person_id VARCHAR(64) NULL,category VARCHAR(20) NOT NULL DEFAULT 'other',ingredients TEXT NOT NULL,instructions MEDIUMTEXT NOT NULL,servings VARCHAR(100) NOT NULL DEFAULT '',prep_minutes INT UNSIGNED NULL,cook_minutes INT UNSIGNED NULL,story TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX recipe_person (person_id),INDEX recipe_category (category)) ENGINE=InnoDB");
 $type=$db->query("SHOW COLUMNS FROM family_media LIKE 'owner_type'")->fetch();if(!str_contains($type['Type'],"'recipe'"))$db->exec("ALTER TABLE family_media MODIFY owner_type ENUM('person','milestone','album','recipe') NOT NULL");
}
function familyRecipes(PDO $db): array {
 $recipes=$db->query("SELECT id,title,COALESCE(person_id,'') AS personId,category,ingredients,instructions,servings,prep_minutes AS prepMinutes,cook_minutes AS cookMinutes,story FROM family_recipes ORDER BY title,id")->fetchAll();$photos=[];
 foreach(familyMediaRows($db) as $media)if($media['owner_type']==='recipe')$photos[$media['owner_id']][]=$media['file_path'];
 foreach($recipes as &$recipe){$recipe['photos']=$photos[$recipe['id']]??[];foreach(['prepMinutes','cookMinutes'] as $key)$recipe[$key]=$recipe[$key]===null?null:(int)$recipe[$key];}unset($recipe);return $recipes;
}
function cleanRecipe(PDO $db,array $row): array {
 $limits=['id'=>64,'title'=>200,'personId'=>64,'category'=>20,'ingredients'=>20000,'instructions'=>50000,'servings'=>100,'story'=>20000];$out=[];
 foreach($limits as $key=>$max){$value=$row[$key]??'';if(!is_string($value)||mb_strlen($value)>$max)throw new InvalidArgumentException('Invalid recipe '.$key.'.');$out[$key]=trim($value);}
 if(!preg_match('/^[a-zA-Z0-9_-]{1,64}$/',$out['id'])||!$out['title']||!$out['ingredients']||!$out['instructions']||!isset(RECIPE_CATEGORIES[$out['category']]))throw new InvalidArgumentException('Add a recipe title, category, ingredients, and instructions.');
 if($out['personId']!==''){$exists=$db->prepare('SELECT 1 FROM family_people WHERE id=?');$exists->execute([$out['personId']]);if(!$exists->fetchColumn())throw new InvalidArgumentException('Choose someone in the family directory for this recipe.');}
 foreach(['prepMinutes','cookMinutes'] as $key){$value=$row[$key]??null;if($value!==null&&(!is_int($value)||$value<0||$value>100000))throw new InvalidArgumentException('Recipe times must be whole minutes.');$out[$key]=$value;}
 $out['photos']=$row['photos']??[];if(!is_array($out['photos']))throw new InvalidArgumentException('Invalid recipe photos.');foreach($out['photos'] as $photo){if(!is_string($photo)||strlen($photo)>3500000)throw new InvalidArgumentException('Invalid recipe photo.');validateStoredImage($photo,'recipes',$out['id']);}
 return $out;
}
function storeRecipe(PDO $db,array $recipe): void {
 $photos=array_map(fn($photo)=>storeImage($photo,'recipes',$recipe['id']),$recipe['photos']);
 $db->prepare('INSERT INTO family_recipes (id,title,person_id,category,ingredients,instructions,servings,prep_minutes,cook_minutes,story) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),person_id=VALUES(person_id),category=VALUES(category),ingredients=VALUES(ingredients),instructions=VALUES(instructions),servings=VALUES(servings),prep_minutes=VALUES(prep_minutes),cook_minutes=VALUES(cook_minutes),story=VALUES(story)')->execute([$recipe['id'],$recipe['title'],$recipe['personId']?:null,$recipe['category'],$recipe['ingredients'],$recipe['instructions'],$recipe['servings'],$recipe['prepMinutes'],$recipe['cookMinutes'],$recipe['story']]);
 syncRecipeMedia($db,$recipe['id'],$photos);
}
function syncRecipeMedia(PDO $db,string $id,array $photos): void {
 $wanted=[];foreach(familyMediaRows($db) as $row)if(!($row['owner_type']==='recipe'&&$row['owner_id']===$id))$wanted[]=[$row['owner_type'],$row['owner_id'],$row['file_path'],(int)$row['display_order']];foreach($photos as $position=>$path)$wanted[]=['recipe',$id,$path,$position];reconcileMediaRows($db,$wanted);
}
