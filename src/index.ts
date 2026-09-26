export interface MatchOptions {
  /** Required: selects the output forms of yeh and kaf. Does not detect language. */
  locale: 'fa' | 'ar';
  /** ZWNJ treatment; default space. ZWJ is preserved, including inside emoji. */
  joiners?: 'space' | 'remove' | 'keep';
  /** Collapse whitespace to one space, or remove it. Default collapse. */
  spacing?: 'collapse' | 'compact';
  /** Ignore common harakat and dagger alef; default ignore. Hamza is preserved. */
  marks?: 'ignore' | 'keep';
  /** Explicitly fold أ إ آ ٱ to ا. Default preserve. */
  alef?: 'preserve' | 'fold';
  /** Explicitly fold ى to the locale's yeh. Default false. */
  foldMaqsura?: boolean;
  /** Fold ASCII A-Z only. Default true; not full Unicode case folding. */
  asciiCaseInsensitive?: boolean;
  /** Ignore Unicode bidi formatting controls in the key. Default ignore. */
  directionMarks?: 'ignore' | 'keep';
}
/** UTF-16 offsets into the original input, end-exclusive. */
export interface Range { start: number; end: number }
export interface MappedText { key: string; ranges: Range[] }
export interface Part extends Range { text: string; match: boolean }
export interface FindOptions { limit?: number }
export interface Collision<T> { key: string; items: T[]; distinctTexts: string[] }
export interface Matcher {
  /** Persist alongside search keys. Reindex when the profile or algorithm changes. */
  readonly profile: string;
  key(text: string): string;
  map(text: string): MappedText;
  /** Nonoverlapping literal matches; empty normalized queries produce no matches. */
  find(text: string, query: string, options?: FindOptions): Range[];
  /** Plain text pieces; render with textContent / framework escaping, not innerHTML. */
  parts(text: string, query: string, options?: FindOptions): Part[];
  /** Distinct source texts sharing a nonempty key. Does not merge or delete records. */
  collisions<T>(items: Iterable<T>, text: (item: T) => string): Collision<T>[];
}
const MAX_INPUT=1_048_576;
const bidi=/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;
const marks=/[\u064B-\u0652\u0670]/u;
const presentation=/[\uFB50-\uFDFF\uFE70-\uFEFC]/u;
function input(text: string): void {
  if (typeof text !== 'string') throw new TypeError('Expected a string');
  if (text.length>MAX_INPUT) throw new RangeError('Text exceeds 1,048,576 UTF-16 code units');
}
/** Independent, non-mutating search normalization for Persian and Arabic text. */
export function createMatcher(options: MatchOptions): Matcher {
  if (!options || !['fa','ar'].includes(options.locale)) throw new TypeError('locale must be fa or ar');
  const config={locale:options.locale,joiners:options.joiners ?? 'space',spacing:options.spacing ?? 'collapse',marks:options.marks ?? 'ignore',alef:options.alef ?? 'preserve',foldMaqsura:options.foldMaqsura ?? false,asciiCaseInsensitive:options.asciiCaseInsensitive ?? true,directionMarks:options.directionMarks ?? 'ignore'};
  for (const [value,allowed] of [[config.joiners,['space','remove','keep']],[config.spacing,['collapse','compact']],[config.marks,['ignore','keep']],[config.alef,['preserve','fold']],[config.directionMarks,['ignore','keep']]] as const) {
    if (!(allowed as readonly string[]).includes(value)) throw new TypeError('Invalid matcher option');
  }
  if(typeof config.foldMaqsura!=='boolean'||typeof config.asciiCaseInsensitive!=='boolean')throw new TypeError('Boolean matcher options must be booleans');
  const profile=`perso-match/v1;${Object.entries(config).map(([key,value])=>`${key}=${value}`).join(';')}`;
  const segmenter=new Intl.Segmenter('und',{granularity:'grapheme'});
  function normalize(text: string, track: boolean): MappedText {
    input(text);
    const chars:string[]=[],ranges:Range[]=[];
    let pending:Range|undefined;
    for (const {segment,index} of segmenter.segment(text)) {
      const span={start:index,end:index+segment.length};
      // Only Arabic presentation forms get compatibility folding; other scripts use NFC.
      let normalized='';
      for(const ch of segment.normalize('NFC')) normalized+=presentation.test(ch) ? ch.normalize('NFKC') : ch;
      normalized=normalized.normalize('NFC');
      for(let ch of normalized) {
        if(config.directionMarks==='ignore'&&bidi.test(ch)) continue;
        if(ch==='\u0640')continue; // tatweel is a shaping extender, not a letter
        if(config.marks==='ignore'&&marks.test(ch))continue;
        if(ch==='\u200C') {
          if(config.joiners==='remove')continue;
          if(config.joiners==='space')ch=' ';
        }
        if(/\s/u.test(ch)) {
          if(config.spacing==='collapse'&&chars.length) pending={start:pending?.start ?? span.start,end:span.end};
          continue;
        }
        if(pending) {chars.push(' ');if(track)ranges.push(pending);pending=undefined;}
        const cp=ch.codePointAt(0)!;
        if(cp>=0x660&&cp<=0x669)ch=String(cp-0x660);
        else if(cp>=0x6f0&&cp<=0x6f9)ch=String(cp-0x6f0);
        if(config.locale==='fa') {if(ch==='ي')ch='ی';if(ch==='ك')ch='ک';}
        else {if(ch==='ی')ch='ي';if(ch==='ک')ch='ك';}
        if(config.foldMaqsura&&ch==='ى')ch=config.locale==='fa'?'ی':'ي';
        if(config.alef==='fold'&&/[أإآٱ]/u.test(ch))ch='ا';
        if(config.asciiCaseInsensitive&&/^[A-Z]$/.test(ch))ch=ch.toLowerCase();
        chars.push(ch);
        // One source span for each UTF-16 code unit, including surrogate pairs.
        if(track)for(let j=0;j<ch.length;j++)ranges.push({...span});
      }
    }
    return {key:chars.join(''),ranges};
  }
  const map=(text:string)=>normalize(text,true);
  const key=(text:string)=>normalize(text,false).key;
  function find(text:string,query:string,findOptions:FindOptions={}):Range[] {
    const limit=findOptions.limit ?? 100;
    if(!Number.isSafeInteger(limit)||limit<1||limit>10000)throw new RangeError('limit must be an integer from 1 to 10000');
    const haystack=map(text),needle=key(query);
    if(!needle)return [];
    const result:Range[]=[];
    let from=0,index:number,found=0;
    while(found<limit&&(index=haystack.key.indexOf(needle,from))!==-1) {
      const range={start:haystack.ranges[index].start,end:haystack.ranges[index+needle.length-1].end};
      const previous=result[result.length-1];
      // Ligatures may expand to several matches within one original grapheme.
      if(previous&&range.start<previous.end)previous.end=Math.max(previous.end,range.end);
      else result.push(range);
      found++;from=index+needle.length;
    }
    return result;
  }
  return Object.freeze({
    profile,key,map,find,
    parts(text:string,query:string,findOptions?:FindOptions):Part[] {
      const ranges=find(text,query,findOptions),parts:Part[]=[];
      let cursor=0;
      for(const range of ranges) {
        if(cursor<range.start)parts.push({start:cursor,end:range.start,text:text.slice(cursor,range.start),match:false});
        parts.push({...range,text:text.slice(range.start,range.end),match:true});cursor=range.end;
      }
      if(cursor<text.length)parts.push({start:cursor,end:text.length,text:text.slice(cursor),match:false});
      return parts;
    },
    collisions<T>(items:Iterable<T>,getText:(item:T)=>string):Collision<T>[] {
      const groups=new Map<string,{items:T[];texts:Set<string>}>();
      for(const item of items) {
        const text=getText(item),normalized=key(text);
        if(!normalized)continue;
        let group=groups.get(normalized);
        if(!group){group={items:[],texts:new Set()};groups.set(normalized,group);}
        group.items.push(item);group.texts.add(text);
      }
      return [...groups].filter(([,group])=>group.texts.size>1).map(([key,group])=>({key,items:group.items,distinctTexts:[...group.texts]}));
    },
  });
}
