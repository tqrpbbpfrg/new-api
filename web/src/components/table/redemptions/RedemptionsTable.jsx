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

import { IconChevronDown, IconChevronRight, IconList, IconUserGroup } from '@douyinfe/semi-icons';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Button, Card, Empty, Space, Tag } from '@douyinfe/semi-ui';
import { useMemo, useState } from 'react';
import CardTable from '../../common/ui/CardTable';
import { getRedemptionsColumns } from './RedemptionsColumnDefs';
import { getRedemptionsGroupedColumns, getRedemptionsSubColumns } from './RedemptionsGroupedColumnDefs';
import DeleteRedemptionModal from './modals/DeleteRedemptionModal';

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
    groupMode,
    expandedGroups,
    toggleGroupExpansion,
    toggleGroupMode,
    batchDeleteGroups,
    selectedKeys,
  } = redemptionsData;

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  // Handle show delete modal
  const showDeleteRedemptionModal = (record) => {
    setDeletingRecord(record);
    setShowDeleteModal(true);
  };

  // Get all columns for normal mode
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
  ]);

  // Get grouped columns for group mode
  const groupedColumns = useMemo(() => {
    return getRedemptionsGroupedColumns({
      t,
      manageRedemption,
      copyText,
      setEditingRedemption,
      setShowEdit,
      refresh,
      expandedGroups,
      toggleGroupExpansion,
      showDeleteRedemptionModal,
    });
  }, [
    t,
    manageRedemption,
    copyText,
    setEditingRedemption,
    setShowEdit,
    refresh,
    expandedGroups,
    toggleGroupExpansion,
    showDeleteRedemptionModal,
  ]);

  // Get sub-table columns for group mode
  const subColumns = useMemo(() => {
    return getRedemptionsSubColumns({
      t,
      manageRedemption,
      copyText,
      setEditingRedemption,
      setShowEdit,
      refresh,
      showDeleteRedemptionModal,
    });
  }, [
    t,
    manageRedemption,
    copyText,
    setEditingRedemption,
    setShowEdit,
    refresh,
    showDeleteRedemptionModal,
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

  // Render grouped table
  const renderGroupedTable = () => {
    // Check if redemptions is valid array
    if (!Array.isArray(redemptions)) {
      return (
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('数据加载失败')}
          style={{ padding: 30 }}
        />
      );
    }

    return (
      <div>
        {redemptions.map((group, index) => {
          // Validate group object structure
          if (!group || typeof group !== 'object') {
            console.warn(`Invalid group object at index ${index}:`, group);
            return null;
          }

          const groupName = group.name || `未命名分组${index + 1}`;
          const groupCount = group.count || 0;
          const groupRedemptions = Array.isArray(group.redemptions) ? group.redemptions : [];
          
          return (
            <Card
              key={groupName}
              style={{ marginBottom: 16 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button
                    type='tertiary'
                    icon={expandedGroups[groupName] ? <IconChevronDown /> : <IconChevronRight />}
                    onClick={() => toggleGroupExpansion(groupName)}
                    size='small'
                    style={{ padding: 2 }}
                  />
                  <span>{groupName}</span>
                  <Tag size='small' color='blue'>
                    {groupCount} {t('个')}
                  </Tag>
                </div>
              }
              headerExtraContent={
                <Space>
                  <Button
                    type='tertiary'
                    size='small'
                    onClick={() => toggleGroupExpansion(groupName)}
                  >
                    {expandedGroups[groupName] ? t('收起') : t('展开')}
                  </Button>
                </Space>
              }
            >
              {expandedGroups[groupName] && (
                <CardTable
                  columns={subColumns}
                  dataSource={groupRedemptions}
                  scroll={compactMode ? undefined : { x: 'max-content' }}
                  pagination={false}
                  loading={loading}
                  rowSelection={rowSelection}
                  onRow={handleRow}
                  size='small'
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mode toggle and batch actions */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            icon={groupMode ? <IconList /> : <IconUserGroup />}
            onClick={toggleGroupMode}
            type={groupMode ? 'primary' : 'default'}
          >
            {groupMode ? t('列表视图') : t('分组视图')}
          </Button>
          {groupMode && selectedKeys.length > 0 && (
            <Button
              type='danger'
              onClick={batchDeleteGroups}
            >
              {t('删除选中分组')} ({selectedKeys.length})
            </Button>
          )}
        </Space>
      </div>

      {groupMode ? (
        <>
          {renderGroupedTable()}
          {/* Pagination for grouped mode */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <CardTable.Pagination
              currentPage={activePage}
              pageSize={pageSize}
              total={tokenCount}
              showSizeChanger={true}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={redemptionsData.handlePageSizeChange}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <CardTable
          columns={tableColumns}
          dataSource={redemptions}
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
      )}

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
