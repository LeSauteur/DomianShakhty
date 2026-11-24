import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inventory,team,assertSameIds} from './helpers/catalog-integrity.mjs';

test('every agent profile publishes exactly their available assigned listings',()=>{
 const listings=inventory();
 for(const agent of team()){
  const html=fs.readFileSync(`dist/team/${agent.slug||agent.id}.html`,'utf8');
  const section=html.match(/<section[^>]* data-agent-listings>[\s\S]*?<\/section>/u)?.[0]||'';
  const expected=listings.filter(r=>r.verified===true && r.status==='available' && r.agentId===agent.id).map(r=>r.id);
  const actual=[...new Set([...section.matchAll(/href="[^"<>]*\/listings\/([a-z0-9-]+)\.html"/g)].map(m=>m[1]))];
  assertSameIds(actual,expected,agent.id);
  assert.equal((section.match(/class="listing-card"/g)||[]).length,expected.length,agent.id);
 }
});
