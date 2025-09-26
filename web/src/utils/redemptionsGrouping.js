/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

export function buildRedemptionGrouping({
  redemptions = [],
  showGroupedOnly = false,
  expandedGroups = {},
}) {
  const groups = {};
  for (const r of redemptions) {
    if (!groups[r.name]) {
      groups[r.name] = {
        items: [],
        giftUsed: 0,
        giftMax: 0,
        hasUnlimited: false,
        totalQuota: 0,
      };
    }
    groups[r.name].items.push(r);
    groups[r.name].totalQuota += r.quota || 0;
    if (r.type === 'gift') {
      groups[r.name].giftUsed += r.used_count || 0;
      if (r.max_use === -1) {
        groups[r.name].hasUnlimited = true;
      } else {
        groups[r.name].giftMax += r.max_use || 0;
      }
    }
  }

  const rows = [];
  Object.entries(groups).forEach(([name, info]) => {
    const aggregated_max_use = info.hasUnlimited ? -1 : info.giftMax;
    const aggregated_usage_rate =
      aggregated_max_use > 0 ? info.giftUsed / aggregated_max_use : null; // null when unlimited or zero
    const first = info.items[0];
    const summary = {
      ...first,
      __groupSummary: true,
      name,
      group_count: info.items.length,
      aggregated_used_count: info.giftUsed,
      aggregated_max_use,
      total_quota: info.totalQuota,
      aggregated_usage_rate,
      __expanded: !!expandedGroups[name],
    };
    rows.push(summary);
    if (!showGroupedOnly && expandedGroups[name]) {
      for (const child of info.items) {
        rows.push({ ...child, __child: true });
      }
    }
  });

  // If not showing grouped only and some groups not expanded, children are hidden; for items in groups not expanded we only have summary rows.
  // Already handled above.

  return { rows, groupsMeta: groups };
}
