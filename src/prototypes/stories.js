// Temporary examples only: no API calls or database records.
export function sampleStories(people = [], photos = []) {
  const paragraphs = {
    table: [
      'Some of the best family stories begin around a table. A familiar recipe, an extra chair, and a conversation that lasts a little longer than expected can become the things we remember most.',
      'This is sample copy for the Stories prototype. A real story could describe who was there, what was served, and the little details that made the gathering feel like home.',
      'Photographs can sit between paragraphs, with captions that preserve the names, places, and memories behind them. Not every story needs an exact date or a perfect photograph to be worth keeping.',
    ],
    home: [
      'A home is more than an address. It is the route to school, the neighbors who knew our names, and the small routines that made each day familiar.',
      'This sample story shows how a longer memory might read. Replace these paragraphs with an account of a family home, a move, or a place that mattered.',
      'Add the voices of different relatives, a photograph of the street, or a memory of a favorite room. Together, these details tell a story a map alone cannot.',
    ],
    photo: [
      'A photograph captures a moment, but the story around it often lives with the people who were there. Who took it? What happened just before the shutter clicked?',
      'This is a demonstration story, not a recorded family memory. It illustrates how pictures and paragraphs can be kept together in one readable place.',
      'Tagging the people mentioned makes the story easier to find later, even when someone remembers a name but not the title.',
    ],
  };
  return [
    ['table','Around the Family Table','2026-11-01','The recipes, conversations, and small traditions that bring a family together.'],
    ['home','The Places We Called Home','2026-10-18','A place to keep the memories that an address alone cannot tell.'],
    ['photo','The Story Behind a Photograph','2026-09-12','Preserving the details just outside the frame.'],
  ].map(([id,title,date,excerpt],index) => {
    const photo = photos[index];
    const blocks = paragraphs[id].map(text => ({type:'paragraph',text}));
    if(photo) blocks.splice(1,0,{type:'image',src:photo,caption:'Example image from your existing albums. This story is sample content.'});
    return {id,title,date,excerpt,authorName:'Sample Contributor',people:people.slice(index,index+2).map(p=>p.id),blocks,sample:true};
  });
}
