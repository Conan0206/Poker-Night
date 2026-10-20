export const avatarChoices=[
 ['😀','Grinning face'],['😎','Sunglasses'],['🤠','Cowboy'],['🥳','Party face'],
 ['😈','Little devil'],['🤖','Robot'],['👻','Ghost'],['😺','Cat'],
 ['🐶','Dog'],['🦊','Fox'],['🐼','Panda'],['🐸','Frog'],
 ['🦁','Lion'],['🐵','Monkey'],['🦄','Unicorn'],['🐙','Octopus']
];
const allowed=new Set([...avatarChoices.map(([emoji])=>emoji),'👽','💀','🤩','🧛','🍀','🌝']);
export const isAllowedAvatar=value=>typeof value==='string'&&allowed.has(value);
export const defaultAvatar='😎';
