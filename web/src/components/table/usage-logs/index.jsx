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

import { Tabs } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { createCardProPagination } from '../../../helpers/utils';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { useLogsData } from '../../../hooks/usage-logs/useUsageLogsData';
import CardPro from '../../common/ui/CardPro';
import LogsActions from './UsageLogsActions';
import LogsFilters from './UsageLogsFilters';
import LogsTable from './UsageLogsTable';
import ColumnSelectorModal from './modals/ColumnSelectorModal';
import UserInfoModal from './modals/UserInfoModal';

const LogsPage = () => {
  const logsData = useLogsData();
  const isMobile = useIsMobile();

  const { t, setLogType, logType, exportLogs } = logsData;
  const [exporting, setExporting] = useState(false);

  const tabList = [
    { key: 0, label: t('全部日志') },
    { key: 1, label: t('充值日志') },
    { key: 2, label: t('消费日志') },
    { key: 3, label: t('管理日志') },
    { key: 4, label: t('系统日志') },
    { key: 5, label: t('错误日志') },
    { key: 6, label: t('抽奖日志') },
    { key: 7, label: t('加成日志') },
  ];

  const tabs = (
    <Tabs
      type='line'
      size='large'
      activeKey={String(logType)}
      onChange={k => {
        setLogType(Number(k));
        logsData.refresh();
      }}
      tabBarStyle={{ marginBottom: 16 }}
    >
      {tabList.map(ti => (
        <Tabs.TabPane tab={ti.label} itemKey={String(ti.key)} key={ti.key} />
      ))}
    </Tabs>
  );

  const handleExport = async () => {
    setExporting(true);
    await exportLogs();
    setExporting(false);
  };

  return (
    <>
      {/* Modals */}
      <ColumnSelectorModal {...logsData} />
      <UserInfoModal {...logsData} />

      {/* Main Content */}
      <CardPro
        type='type2'
        statsArea={<LogsActions {...logsData} onExport={handleExport} exporting={exporting} />}
        searchArea={<div>
          {tabs}
          <LogsFilters {...logsData} />
        </div>}
        paginationArea={createCardProPagination({
          currentPage: logsData.activePage,
          pageSize: logsData.pageSize,
          total: logsData.logCount,
          onPageChange: logsData.handlePageChange,
          onPageSizeChange: logsData.handlePageSizeChange,
          isMobile: isMobile,
          t: logsData.t,
        })}
        t={logsData.t}
      >
        <LogsTable {...logsData} />
      </CardPro>
    </>
  );
};

export default LogsPage;
