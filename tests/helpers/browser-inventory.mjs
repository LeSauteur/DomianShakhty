import fs from 'node:fs';
import { isAvailableListing,categoryForListing } from '../../src/listing-search.mjs';
export const listings=JSON.parse(fs.readFileSync('src/data/listings.json','utf8'));
export const available=(category,city)=>listings.filter(isAvailableListing).filter(x=>(!category||categoryForListing(x)===category)&&(!city||x.location===city));
export const publishedTeam=JSON.parse(fs.readFileSync('src/data/team.json','utf8')).filter(x=>x.verified);
export async function expectListingIds(expect,locator,expected) {
 await expect(locator).toHaveCount(expected.length);
 const ids=await locator.evaluateAll(nodes=>nodes.map(x=>x.dataset.listingId));
 expect(new Set(ids).size).toBe(ids.length);expect(ids.sort()).toEqual(expected.map(x=>x.id).sort());
}
export const constructionProjects=JSON.parse(fs.readFileSync('src/data/construction-projects.json','utf8')).items;
export const newbuildProjects=JSON.parse(fs.readFileSync('src/data/newbuilds.json','utf8')).items;
