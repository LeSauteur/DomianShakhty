import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicationApproval} from '../src/listing-publication.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'src/data/listings.json');
const records=JSON.parse(fs.readFileSync(file,'utf8'));
if(records.length!==37||records.some(item=>item.verified!==true))throw new Error('Unexpected published inventory; review before normalizing');
const updated=records.map(item=>{
  const approved=publicationApproval(item);
  if(item.id==='shk-a16-2k-50-individual'){
    const original=item.descriptionOriginal||item.description;
    const featuresOriginal=item.featuresOriginal||item.features;
    approved.descriptionOriginal=original;
    approved.featuresOriginal=featuresOriginal;
    approved.description=original.replace(/\s*Площадь кухни[^.!?]*7,5 м²[^.!?]*7 м²[^.!?]*[.!?]?/u,'').trim();
    approved.features=featuresOriginal.filter(feature=>!/^Кухня\s+7/iu.test(feature));
    approved.contentIssues=[{field:'kitchenArea',values:[7,7.5],reason:'conflicting_source_values'}];
  }
  return approved;
});
fs.writeFileSync(file,JSON.stringify(updated,null,2)+'\n','utf8');
console.log('Publication approval:',updated.length,'; status Актуально:',updated.filter(x=>x.statusLabel==='Актуально').length);
