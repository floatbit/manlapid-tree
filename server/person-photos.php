<?php
/** Independent personal photo references. Headshots remain owner_type=person. */
function initializePersonPhotos(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS family_person_photo_pins (person_id VARCHAR(64) NOT NULL,file_path VARCHAR(512) NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),PRIMARY KEY(person_id,file_path)) ENGINE=InnoDB");
    $type=$db->query("SHOW COLUMNS FROM family_media LIKE 'owner_type'")->fetch();
    if(!str_contains($type['Type'],"'person_photo'"))$db->exec("ALTER TABLE family_media MODIFY owner_type ENUM('person','milestone','album','recipe','person_photo') NOT NULL");
}
function storePersonPhotos(PDO $db,string $personId,$photos,string $albumId='',string $albumTitle=''): void {
    $find=$db->prepare('SELECT name FROM family_people WHERE id=?');$find->execute([$personId]);
    if(!$find->fetchColumn())throw new InvalidArgumentException('Save the person before adding photos.');
    if(!is_array($photos)||array_values($photos)!==$photos||!count($photos)||count($photos)>50)throw new InvalidArgumentException('Choose between 1 and 50 photos.');
    if($albumId!==''&&$albumTitle!=='')throw new InvalidArgumentException('Choose an album or create a new one.');
    if($albumId!==''){$find=$db->prepare('SELECT id FROM family_albums WHERE id=?');$find->execute([$albumId]);if(!$find->fetchColumn())throw new InvalidArgumentException('This album no longer exists.');}
    $paths=[];
    foreach($photos as $photo){
        if(!is_string($photo)||!str_starts_with($photo,'data:image/'))throw new InvalidArgumentException('Choose image files to upload.');
        $paths[]=storeImage($photo,'people',$personId);
    }
    $wanted=[];$existing=[];$position=0;
    foreach(familyMediaRows($db) as $row){$wanted[]=[$row['owner_type'],$row['owner_id'],$row['file_path'],(int)$row['display_order']];if($row['owner_type']==='person_photo'&&$row['owner_id']===$personId){$existing[]=$row['file_path'];$position=max($position,(int)$row['display_order']+1);}}
    foreach(array_unique($paths) as $path)if(!in_array($path,$existing,true)){$wanted[]=['person_photo',$personId,$path,$position++];$existing[]=$path;}
    reconcileMediaRows($db,$wanted);
    $tags=photoTags($db);
    foreach(array_unique($paths) as $path)savePhotoTags($db,$path,array_values(array_unique([...($tags[$path]??[]),$personId])));
    if($albumTitle!==''){
        if(!trim($albumTitle)||mb_strlen($albumTitle)>200)throw new InvalidArgumentException('Enter an album title under 200 characters.');
        $albumId='album-'.bin2hex(random_bytes(12));$db->prepare("INSERT INTO family_albums(id,title,description) VALUES (?,?,'')")->execute([$albumId,trim($albumTitle)]);
    }
    if($albumId!==''){
        $current=[];foreach(familyMediaRows($db) as $row)if($row['owner_type']==='album'&&$row['owner_id']===$albumId)$current[]=$row['file_path'];
        syncAlbumMedia($db,$albumId,array_values(array_unique([...$current,...$paths])));
        // Both references to the same file retain the same person tags.
        foreach(array_unique($paths) as $path)savePhotoTags($db,$path,array_values(array_unique([...($tags[$path]??[]),$personId])));
    }
}

/** Pins belong to a person's gallery, never to headshots or an entire album. */
function personPhotoPins(PDO $db): array {
    $pins=[];
    foreach($db->query('SELECT pin.person_id,pin.file_path FROM family_person_photo_pins pin JOIN family_people p ON p.id=pin.person_id ORDER BY pin.created_at DESC,pin.file_path')->fetchAll() as $row)$pins[$row['person_id']][]=$row['file_path'];
    return $pins;
}
function setPersonPhotoPin(PDO $db,string $personId,string $photo,$pinned): void {
    if(!is_bool($pinned))throw new InvalidArgumentException('Choose whether to pin this photo.');
    $tags=photoTags($db);
    $find=$db->prepare('SELECT photo,headshot_original FROM family_people WHERE id=?');$find->execute([$personId]);$person=$find->fetch();
    if(!$person||!in_array($personId,$tags[$photo]??[],true)||in_array($photo,[$person['photo'],$person['headshot_original']],true)||preg_match('/\.(mp4|mov)$/i',$photo))throw new InvalidArgumentException('Choose a tagged photo from this person’s Photos.');
    if($pinned)$db->prepare('INSERT IGNORE INTO family_person_photo_pins(person_id,file_path) VALUES (?,?)')->execute([$personId,$photo]);
    else $db->prepare('DELETE FROM family_person_photo_pins WHERE person_id=? AND file_path=?')->execute([$personId,$photo]);
}
