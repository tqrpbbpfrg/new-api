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

import {
    IllustrationNoResult,
    IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Button, Empty, Space, Tag } from '@douyinfe/semi-ui';
import { useMemo, useState } from 'react';
import { buildRedemptionGrouping } from '../../../utils/redemptionsGrouping';
import CardTable from '../../common/ui/CardTable';
import DeleteRedemptionModal from './modals/DeleteRedemptionModal';
import { getRedemptionsColumns } from './RedemptionsColumnDefs';

const RedemptionsTable = (redemptionsData) => {
  const {
    redemptions,
    loading,
    activePage,
    pageSize,
    tokenCount,
    compactMode,
    handlePageChange,
    rowSelection,
    handleRow,
    manageRedemption,
    copyText,
    setEditingRedemption,
    setShowEdit,
    refresh,
    t,
  } = redemptionsData;

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  // Handle show delete modal
  const showDeleteRedemptionModal = (record) => {
    setDeletingRecord(record);
    setShowDeleteModal(true);
  };

  // Get all columns
  const columns = useMemo(() => {
    return getRedemptionsColumns({
      t,
      manageRedemption,
      copyText,
      setEditingRedemption,
      setShowEdit,
      refresh,
      redemptions,
      activePage,
      showDeleteRedemptionModal,
      groupSelection: redemptionsData.groupSelection,
      setGroupSelection: redemptionsData.setGroupSelection,
      setSelectedKeys: redemptionsData.setSelectedKeys,
      expandedGroups: redemptionsData.expandedGroups,
      setExpandedGroups: redemptionsData.setExpandedGroups,
    });
  }, [
    t,
    manageRedemption,
    copyText,
    setEditingRedemption,
    setShowEdit,
    refresh,
    redemptions,
    activePage,
    showDeleteRedemptionModal,
    redemptionsData.groupSelection,
    redemptionsData.expandedGroups,
  ]);

  // Handle compact mode by removing fixed positioning
  const tableColumns = useMemo(() => {
    return compactMode
      ? columns.map((col) => {
          if (col.dataIndex === 'operate') {
            const { fixed, ...rest } = col;
            return rest;
          }
          return col;
        })
      : columns;
  }, [compactMode, columns]);

  // Compute global analytics from grouped summaries
  const globalSummary = useMemo(() => {
    const map = {};
    let totalGroups = 0;
    let unlimitedGroups = 0;
    let totalGiftUsed = 0;
    let totalGiftMax = 0;
    redemptionsData.groupedRows?.forEach((r) => {
      if (!r.__groupSummary) return;
      totalGroups += 1;
      if (r.aggregated_max_use === -1) {
        unlimitedGroups += 1;
      } else {
        totalGiftUsed += r.aggregated_used_count || 0;
        totalGiftMax += r.aggregated_max_use || 0;
      }
    });
    const usageRate = totalGiftMax > 0 ? (totalGiftUsed / totalGiftMax) * 100 : null;
    return { totalGroups, unlimitedGroups, totalGiftUsed, totalGiftMax, usageRate };
  }, [redemptionsData.groupedRows]);

  const exportCSV = () => {
    const headers = ['Group','Count','GiftUsed','GiftMax','Unlimited','UsageRate(%)','TotalQuota'];
    const lines = [headers.join(',')];
    (redemptionsData.groupedRows || []).forEach(r => {
      if (!r.__groupSummary) return;
      const rate = r.aggregated_max_use > 0 ? (r.aggregated_used_count / r.aggregated_max_use * 100).toFixed(2) : '';
      lines.push([
        r.name,
        r.group_count,
        r.aggregated_used_count,
        r.aggregated_max_use === -1 ? '' : r.aggregated_max_use,
        r.aggregated_max_use === -1 ? 'Y' : 'N',
        rate,
        r.total_quota || 0,
      ].join(','));
    });
    if (globalSummary) {
      lines.push(['TOTAL','','','','','', '']);
      lines.push([
        'ALL_GROUPS',
        globalSummary.totalGroups,
        globalSummary.totalGiftUsed,
        globalSummary.totalGiftMax,
        globalSummary.unlimitedGroups,
        globalSummary.usageRate ? globalSummary.usageRate.toFixed(2) : '',
        '',
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'redemptions_groups.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className='flex flex-wrap items-center gap-2 mb-2'>
        <Space spacing={8}>
          <Button size='small' type='tertiary' onClick={exportCSV}>{t('导出')}</Button>
          <Tag color='blue' shape='circle'>{t('分组数')}: {globalSummary.totalGroups}</Tag>
          <Tag color='purple' shape='circle'>{t('无限分组')}: {globalSummary.unlimitedGroups}</Tag>
          {globalSummary.usageRate !== null && (
            <Tag color={globalSummary.usageRate >= 80 ? 'red' : 'green'} shape='circle'>
              {t('总体使用率')}: {globalSummary.usageRate.toFixed(1)}%
            </Tag>
          )}
        </Space>
      </div>
      <CardTable
        columns={tableColumns}
        dataSource={useMemo(() => {
          const { rows } = buildRedemptionGrouping({
            redemptions,
            showGroupedOnly: redemptionsData.showGroupedOnly,
            expandedGroups: redemptionsData.expandedGroups,
          });
          return rows;
        }, [redemptions, redemptionsData.showGroupedOnly, redemptionsData.expandedGroups])}
        scroll={compactMode ? undefined : { x: 'max-content' }}
        pagination={{
          currentPage: activePage,
          pageSize: pageSize,
          total: tokenCount,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onPageSizeChange: redemptionsData.handlePageSizeChange,
          onPageChange: handlePageChange,
        }}
        hidePagination={true}
        loading={loading}
        rowSelection={rowSelection}
        onRow={handleRow}
        empty={
          <Empty
            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
            darkModeImage={
              <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
            }
            description={t('搜索无结果')}
            style={{ padding: 30 }}
          />
        }
        className='rounded-xl overflow-hidden'
        size='middle'
      />

      <DeleteRedemptionModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        record={deletingRecord}
        manageRedemption={manageRedemption}
        refresh={refresh}
        redemptions={redemptions}
        activePage={activePage}
        t={t}
      />
    </>
  );
};

export default RedemptionsTable;
