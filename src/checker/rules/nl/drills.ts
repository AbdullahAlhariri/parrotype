// Which Gym drill pack (src/content/drills) trains the mistake a rule found.

const BY_ID: Record<string, string> = {
  'nl.aux.zijn': 'nl.participle',
  'nl.past.kofschip': 'nl.kofschip',
  'nl.past.dde': 'nl.kofschip',
  'nl.loan.participle': 'nl.kofschip',
  'nl.prn.hun-subject': 'nl.hun-hen',
  'nl.prn.me-mijn': 'nl.me-mijn',
  'nl.prn.jouw-jou': 'nl.jou-jouw',
  'nl.prn.u-uw': 'nl.jou-jouw',
  'nl.spell.tussen-n': 'nl.compounds',
  'nl.spell.trema': 'nl.trema-apostrof',
  'nl.spell.no-trema': 'nl.trema-apostrof',
  'nl.spell.apostrophe': 'nl.trema-apostrof',
  'nl.spell.plural-apostrophe': 'nl.trema-apostrof',
  'nl.spell.zei-zij': 'nl.ei-ij',
  'nl.spell.reist-rijst': 'nl.ei-ij',
  'nl.spell.lijdt-leidt': 'nl.ei-ij',
}

const BY_PREFIX: Array<[string, string]> = [
  ['nl.dt.', 'nl.dt'],
  ['nl.agr.', 'nl.dt'],
  ['nl.part.', 'nl.participle'],
  ['nl.art.', 'nl.de-het'],
  ['nl.adj.', 'nl.de-het'],
  ['nl.rel.', 'nl.die-dat'],
  ['nl.cmp.', 'nl.als-dan'],
  ['nl.compound.', 'nl.compounds'],
]

/** Drill pack id for a Dutch rule id, e.g. 'nl.dt.hij-t' -> 'nl.dt'. Undefined when no pack fits. */
export function drillPackFor(ruleId: string): string | undefined {
  return BY_ID[ruleId] ?? BY_PREFIX.find(([p]) => ruleId.startsWith(p))?.[1]
}
