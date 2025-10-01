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

import React from 'react';
import { Tag, Button, Space, Popover, Dropdown } from '@douyinfe/semi-ui';
import { IconMore, IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';
import { renderQuota, timestamp2string } from '../../../helpers';
import {
  REDEMPTION_STATUS,
  REDEMPTION_STATUS_MAP,
  REDEMPTION_ACTIONS,
  REDEMPTION_TYPE,
  REDEMPTION_TYPE_MAP,
} from '../../../constants/redemption.constants';

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
 * Render redemption code type
 */
const renderType = (type, record, t) => {
  const typeConfig = REDEMPTION_TYPE_MAP[type];
  if (typeConfig) {
    return (
      <Tag color={typeConfig.color} shape='circle'>
        {t(typeConfig.text)}
      </Tag>
    );
  }

  return (
    <Tag color='black' shape='circle'>
      {t('未知类型')}
    </Tag>
  );
};

/**
 * Render gift code info
 */
const renderGiftInfo = (record, t) => {
  if (record.type === REDEMPTION_TYPE.GIFT) {
    return (
      <div>
        <div>
          <Tag size='small' color='blue'>
            {t('使用人数')}: {record.max_uses}
          </Tag>
        </div>
        <div style={{ marginTop: 4 }}>
          <Tag size='small' color='purple'>
            {t('每人次数')}: {record.max_uses_per_user}
          </Tag>
        </div>
        <div style={{ marginTop: 4 }}>
          <Tag size='small' color='green'>
            {t('已使用')}: {record.used_count}/{record.max_uses}
          </Tag>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Get redemption code table column definitions for grouped mode
 */
export const getRedemptionsGroupedColumns = ({
  t,
  manageRedemption,
  copyText,
  setEditingRedemption,
  setShowEdit,
  refresh,
  expandedGroups,
  toggleGroupExpansion,
  showDeleteRedemptionModal,
}) => {
  return [
    {
      title: t('分组名称'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const isExpanded = expandedGroups[text];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type='tertiary'
              icon={isExpanded ? <IconChevronDown /> : <IconChevronRight />}
              onClick={() => toggleGroupExpansion(text)}
              size='small'
              style={{ padding: 2 }}
            />
            <span>{text}</span>
            <Tag size='small' color='blue'>
              {record.count} {t('个')}
            </Tag>
          </div>
        );
      },
    },
    {
      title: t('操作'),
      dataIndex: 'operate',
      fixed: 'right',
      width: 150,
      render: (text, record) => {
        return (
          <Space>
            <Button
              type='tertiary'
              size='small'
              onClick={() => toggleGroupExpansion(record.name)}
            >
              {expandedGroups[record.name] ? t('收起') : t('展开')}
            </Button>
          </Space>
        );
      },
    },
  ];
};

/**
 * Get redemption code sub-table column definitions for grouped mode
 */
export const getRedemptionsSubColumns = ({
  t,
  manageRedemption,
  copyText,
  setEditingRedemption,
  setShowEdit,
  refresh,
  showDeleteRedemptionModal,
}) => {
  return [
    {
      title: t('ID'),
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text, record) => {
        return <div>{renderStatus(text, record, t)}</div>;
      },
    },
    {
      title: t('类型'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (text, record) => {
        return <div>{renderType(text, record, t)}</div>;
      },
    },
    {
      title: t('额度'),
      dataIndex: 'quota',
      width: 120,
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
      title: t('礼品码信息'),
      dataIndex: 'gift_info',
      key: 'gift_info',
      width: 200,
      render: (text, record) => {
        return <div>{renderGiftInfo(record, t)}</div>;
      },
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      width: 150,
      render: (text) => {
        return <div>{renderTimestamp(text)}</div>;
      },
    },
    {
      title: t('过期时间'),
      dataIndex: 'expired_time',
      width: 150,
      render: (text) => {
        return <div>{text === 0 ? t('永不过期') : renderTimestamp(text)}</div>;
      },
    },
    {
      title: t('兑换人ID'),
      dataIndex: 'used_user_id',
      width: 100,
      render: (text) => {
        return <div>{text === 0 ? t('无') : text}</div>;
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
