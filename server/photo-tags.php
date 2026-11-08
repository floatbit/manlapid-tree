<?php
function initializePhotoTags(PDO $db): void {
    // People are replaced during profile saves, so person IDs are validated without a cascading FK.
    $db->exec("CREATE TABLE IF NOT EXISTS family_photo_tags (media_id CHAR(36) NOT NULL,person_id VARCHAR(64) NOT NULL,PRIMARY KEY(media_id,person_id),CONSTRAINT photo_tag_media FOREIGN KEY(media_id) REFERENCES family_media(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
function photoTags(PDO $db): array {
    $tags=[];
    $rows=$db->query('SELECT DISTINCT m.file_path,t.person_id FROM family_photo_tags t JOIN family_media m ON m.id=t.media_id JOIN family_people p ON p.id=t.person_id ORDER BY m.file_path,t.person_id')->fetchAll();
    foreach($rows as $row)$tags[$row['file_path']][]=$row['person_id'];
    return $tags;
}
function savePhotoTags(PDO $db,string $path,$people): void {
    if(!is_array($people)||array_values($people)!==$people||count($people)>5000)throw new InvalidArgumentException('Choose people from the directory.');
    $query=$db->prepare("SELECT id FROM family_media WHERE file_path=? AND media_type='image' AND owner_type<>'person'");$query->execute([$path]);$media=$query->fetchAll(PDO::FETCH_COLUMN);
    if(!$media)throw new InvalidArgumentException('Save this photo to an album before tagging people.');
    $known=array_fill_keys($db->query('SELECT id FROM family_people')->fetchAll(PDO::FETCH_COLUMN),true);
    foreach($people as $id)if(!is_string($id)||!isset($known[$id]))throw new InvalidArgumentException('A selected person no longer exists.');
    $remove=$db->prepare('DELETE FROM family_photo_tags WHERE media_id=?');$insert=$db->prepare('INSERT INTO family_photo_tags(media_id,person_id) VALUES (?,?)');
    foreach($media as $id){$remove->execute([$id]);foreach(array_unique($people) as $person)$insert->execute([$id,$person]);}
}
function importPhotoTags(PDO $db,$assignments): void {
    if(!is_array($assignments)||count($assignments)>100000)throw new InvalidArgumentException('Invalid photo tags.');
    $find=$db->prepare('SELECT file_path FROM family_media WHERE owner_type=? AND owner_id=? AND display_order=? LIMIT 1');
    foreach($assignments as $entry){
        if(!is_array($entry)||!in_array($entry['type']??null,['album','recipe','milestone'],true)||!is_string($entry['owner']??null)||!is_int($entry['index']??null)||!is_string($entry['fingerprint']??null)||!is_array($entry['people']??null))throw new InvalidArgumentException('Invalid photo tags.');
        $find->execute([$entry['type'],$entry['owner'],$entry['index']]);$path=$find->fetchColumn();
        // Existing albums may have changed since the backup: never tag a different photo by index.
        if(!$path||basename($path)!==$entry['fingerprint'])continue;
        $existing=photoTags($db)[$path]??[];
        savePhotoTags($db,$path,array_values(array_unique(array_merge($existing,$entry['people']))));
    }
}
function deleteLightboxPhoto(PDO $db,string $path): void {
    $rows=familyMediaRows($db);$found=false;$wanted=[];
    foreach($rows as $row){
        if($row['file_path']===$path&&$row['media_type']==='image'&&$row['owner_type']!=='person'){$found=true;continue;}
        $wanted[]=[$row['owner_type'],$row['owner_id'],$row['file_path'],(int)$row['display_order']];
    }
    if(!$found)throw new InvalidArgumentException('This photo is no longer available.');
    reconcileMediaRows($db,$wanted);
}
