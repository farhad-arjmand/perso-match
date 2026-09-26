import {createMatcher,type Range,type Collision} from 'perso-match';
const m=createMatcher({locale:'fa'});
const ranges:Range[]=m.find('علي','علی');
const groups:Collision<{id:number;name:string}>[]=m.collisions([{id:1,name:'علی'}],x=>x.name);
// @ts-expect-error language choice is required
createMatcher({});
// @ts-expect-error only Persian and Arabic are covered
createMatcher({locale:'en'});
void ranges;void groups;
