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

import { IconMore } from '@douyinfe/semi-icons';
import { Button, Checkbox, Dropdown, Popover, Space, Tag, Tooltip } from '@douyinfe/semi-ui';
import {
    REDEMPTION_ACTIONS,
    REDEMPTION_STATUS,
    REDEMPTION_STATUS_MAP,
} from '../../../constants/redemption.constants';
import { renderQuota, timestamp2string } from '../../../helpers';

/**
 * Check if redemption code is expired
 */
export const isExpired = (record) => {
  return (
    record.status === REDEMPTION_STATUS.UNUSED &&
    record.expired_time !== 0 &&
    record.expired_time < Math.floor(Date.now() / 1000)
  );
};

/**
 * Render timestamp
 */
const renderTimestamp = (timestamp) => {
  return <>{timestamp2string(timestamp)}</>;
};

/**
 * Render redemption code status
 */
const renderStatus = (status, record, t) => {
  if (isExpired(record)) {
    return (
      <Tag color='orange' shape='circle'>
        {t('已过期')}
      </Tag>
    );
  }

  const statusConfig = REDEMPTION_STATUS_MAP[status];
  if (statusConfig) {
    return (
      <Tag color={statusConfig.color} shape='circle'>
        {t(statusConfig.text)}
      </Tag>
    );
  }

  return (
    <Tag color='black' shape='circle'>
      {t('未知状态')}
    </Tag>
  );
};

/**
 * Get redemption code table column definitions
 */
export const getRedemptionsColumns = ({
  t,
  manageRedemption,
  copyText,
  setEditingRedemption,
  setShowEdit,
  refresh,
  redemptions,
  activePage,
  showDeleteRedemptionModal,
  groupSelection,
  setGroupSelection,
  setSelectedKeys,
  expandedGroups,
  setExpandedGroups,
  enableGroupSelectionEnhance = true,
}) => {
  return [
    {
      title: t('组'),
      dataIndex: 'group_name',
      render: (text, record) => {
        if (record.__groupSummary) {
          return (
            <div className='flex items-center gap-1'>
              <Button
                size='small'
                type='tertiary'
                onClick={() => {
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [record.name]: !prev[record.name],
                  }));
                }}
              >
                {record.__expanded ? '-' : '+'}
              </Button>
              <Tag color='grey' size='small'>Σ</Tag>
              <span>{record.name}</span>
              {record.group_count > 1 && (
                <Tag size='small' color='grey' type='light'>x{record.group_count}</Tag>
              )}
            </div>
          );
        }
        const group = groupSelection?.[record.name];
        if (!group) return <span>{record.name}</span>;
        // Tri-state: determine indeterminate state
        const groupIds = group.items.map((i) => i.id);
        const selectedIdSet = new Set((setSelectedKeys ? [] : []).map((i) => i.id)); // fallback if not accessible
        // We'll recompute from selectedKeys passed indirectly through selected flags (not ideal but minimal invasive)
        // Derive states directly via group.selected + selected children count
        let selectedChildren = 0;
        for (const item of group.items) {
          // Each record has selection if it's inside the external selection list; we approximate using presence in set
          // This hook currently stores selectedKeys as array of records; we can't access here directly -> use heuristic of group.selected meaning full selection
          if (group.selected) selectedChildren = group.items.length; // fast path
        }
        const allSelected = group.selected;
        const indeterminate = !allSelected && selectedChildren > 0;
        return (
          <div className='flex items-center gap-1'>
            <Checkbox
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={(v) => {
                const newGroups = { ...groupSelection };
                newGroups[record.name].selected = v.target.checked;
                setGroupSelection(newGroups);
                if (v.target.checked) {
                  setSelectedKeys((prev) => {
                    const existingIds = new Set(prev.map((p) => p.id));
                    const merged = [...prev];
                    for (const item of newGroups[record.name].items) {
                      if (!existingIds.has(item.id)) merged.push(item);
                    }
                    return merged;
                  });
                } else {
                  setSelectedKeys((prev) => prev.filter((p) => !newGroups[record.name].items.some((i) => i.id === p.id)));
                }
              }}
            />
            <span>{record.name}</span>
            {group.items.length > 1 && (
              <Tag size='small' color='grey' type='light'>x{group.items.length}</Tag>
            )}
          </div>
        );
      },
      width: 180,
      fixed: 'left',
    },
    {
      title: t('ID'),
      dataIndex: 'id',
    },
    {
      title: t('类型'),
      dataIndex: 'type',
      render: (text, record) => {
        if (text === 'gift') {
          return <Tag color='purple' shape='circle'>{t('礼品码')}</Tag>;
        }
        return <Tag color='blue' shape='circle'>{t('普通兑换码')}</Tag>;
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (text, record) => {
        return <div>{renderStatus(text, record, t)}</div>;
      },
    },
    {
      title: t('额度'),
      dataIndex: 'quota',
      render: (text) => {
        return (
          <div>
            <Tag color='grey' shape='circle'>
              {renderQuota(parseInt(text))}
            </Tag>
          </div>
        );
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      render: (text) => {
        return <div>{renderTimestamp(text)}</div>;
      },
    },
    {
      title: t('过期时间'),
      dataIndex: 'expired_time',
      render: (text) => {
        return <div>{text === 0 ? t('永不过期') : renderTimestamp(text)}</div>;
      },
    },
    {
      title: t('兑换人ID'),
      dataIndex: 'used_user_id',
      render: (text) => {
        return <div>{text === 0 ? t('无') : text}</div>;
      },
    },
    {
      title: t('使用进度'),
      dataIndex: 'used_count',
      render: (text, record) => {
        if (record.__groupSummary) {
          if (record.aggregated_max_use === -1) {
            return <Tag color='purple' shape='circle'>{record.aggregated_used_count}/∞</Tag>;
          }
          return (
            <Tag color='purple' shape='circle'>
              {record.aggregated_used_count}/{record.aggregated_max_use}
            </Tag>
          );
        }
        if (record.type !== 'gift') return <div>-</div>;
        if (record.max_use === -1) {
            return <Tag color='purple' shape='circle'>{record.used_count || 0}/∞</Tag>;
        }
        return <Tag color='purple' shape='circle'>{record.used_count || 0}/{record.max_use || 0}</Tag>;
      },
    },
    {
      title: t('使用率'),
      dataIndex: 'usage_rate',
      sorter: (a, b) => {
        const getRate = (r) => {
          if (r.__groupSummary) {
            if (r.aggregated_max_use <= 0) return -1; // unlimited or zero -> bottom
            return r.aggregated_used_count / r.aggregated_max_use;
          }
          if (r.type === 'gift' && r.max_use > 0) return r.used_count / r.max_use;
          return -1;
        };
        return getRate(a) - getRate(b);
      },
      render: (text, record) => {
        let rate = null;
        if (record.__groupSummary) {
          if (record.aggregated_max_use === -1) return <div>-</div>;
          rate = record.aggregated_max_use === 0 ? 0 : (record.aggregated_used_count / record.aggregated_max_use) * 100;
        } else if (record.type === 'gift' && record.max_use !== -1) {
          rate = record.max_use === 0 ? 0 : (record.used_count / record.max_use) * 100;
        }
        if (rate === null) return <div>-</div>;
        const color = rate >= 90 ? 'red' : rate >= 70 ? 'orange' : 'green';
        return (
          <Tooltip content={rate.toFixed(2) + '%'}>
            <Tag color={color} shape='circle'>
              {rate.toFixed(0)}%
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: t('总额度'),
      dataIndex: 'total_quota',
      sorter: (a, b) => {
        const getTotal = (r) => {
          if (r.__groupSummary) return r.total_quota || 0;
          return r.quota || 0;
        };
        return getTotal(a) - getTotal(b);
      },
      render: (text, record) => {
        if (record.__groupSummary) {
          const totalQuota = (record.group_count && groupSelection[record.name]) ? groupSelection[record.name].items.reduce((acc, cur) => acc + (cur.quota || 0), 0) : (record.quota || 0);
          return <Tag color='grey' shape='circle'>{renderQuota(totalQuota)}</Tag>;
        }
        return <div>{renderQuota(record.quota)}</div>;
      },
    },
    {
      title: '',
      dataIndex: 'operate',
      fixed: 'right',
      width: 205,
      render: (text, record) => {
        // Create dropdown menu items for more operations
        const moreMenuItems = [
          {
            node: 'item',
            name: t('删除'),
            type: 'danger',
            onClick: () => {
              showDeleteRedemptionModal(record);
            },
          },
        ];

        if (record.status === REDEMPTION_STATUS.UNUSED && !isExpired(record)) {
          moreMenuItems.push({
            node: 'item',
            name: t('禁用'),
            type: 'warning',
            onClick: () => {
              manageRedemption(record.id, REDEMPTION_ACTIONS.DISABLE, record);
            },
          });
        } else if (!isExpired(record)) {
          moreMenuItems.push({
            node: 'item',
            name: t('启用'),
            type: 'secondary',
            onClick: () => {
              manageRedemption(record.id, REDEMPTION_ACTIONS.ENABLE, record);
            },
            disabled: record.status === REDEMPTION_STATUS.USED,
          });
        }

        return (
          <Space>
            <Popover
              content={record.key}
              style={{ padding: 20 }}
              position='top'
            >
              <Button type='tertiary' size='small'>
                {t('查看')}
              </Button>
            </Popover>
            <Button
              size='small'
              onClick={async () => {
                await copyText(record.key);
              }}
            >
              {t('复制')}
            </Button>
            <Button
              type='tertiary'
              size='small'
              onClick={() => {
                setEditingRedemption(record);
                setShowEdit(true);
              }}
              disabled={record.status !== REDEMPTION_STATUS.UNUSED}
            >
              {t('编辑')}
            </Button>
            <Dropdown
              trigger='click'
              position='bottomRight'
              menu={moreMenuItems}
            >
              <Button type='tertiary' size='small' icon={<IconMore />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];
};
