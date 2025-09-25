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

import { Card, Empty, Typography, List, Tag, Space, Button } from '@douyinfe/semi-ui';
import { IconRefresh, IconBulb, IconCalendar } from '@douyinfe/semi-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { isAdmin } from '../../../helpers';
import { useAnnouncements } from '../../../hooks/message/useAnnouncements';

const { Title, Text, Paragraph } = Typography;

export default function AnnouncementBoard() {
  const { t } = useTranslation();
  const admin = isAdmin();
  const [loading, setLoading] = useState(false);
  const { items: announcements, refresh } = useAnnouncements();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const renderAnnouncementItem = (announcement, index) => {
    const isRecent = announcement.date && dayjs().diff(dayjs(announcement.date), 'day') <= 7;
    
    return (
      <List.Item
        key={announcement.id || announcement.date || index}
        style={{
          padding: '16px',
          border: '1px solid var(--semi-color-border)',
          borderRadius: '8px',
          marginBottom: '12px',
          background: '#fff'
        }}
      >
        <div className='w-full'>
          <div className='flex justify-between items-start mb-2'>
            <Space>
              <IconBulb style={{ color: '#1890ff' }} />
              <Text strong>{t('系统公告')}</Text>
              {isRecent && (
                <Tag color="red" size="small">
                  {t('新')}
                </Tag>
              )}
            </Space>
            {announcement.date && (
              <Space>
                <IconCalendar size="small" />
                <Text type="tertiary" size="small">
                  {dayjs(announcement.date).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Space>
            )}
          </div>
          
          <div 
            className='announcement-content'
            dangerouslySetInnerHTML={{ __html: announcement.content }}
            style={{
              lineHeight: '1.6',
              fontSize: '14px',
              color: '#666'
            }}
          />
        </div>
      </List.Item>
    );
  };

  return (
    <div className='space-y-4' style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
      <div className='flex justify-between items-center'>
        <div>
          <Title heading={4} style={{ margin: 0 }}>
            {t('系统公告')}
          </Title>
          <Text type="tertiary" size="small">
            {t('查看最新的系统通知和重要信息')}
          </Text>
        </div>
        
        <Space>
          <Button
            icon={<IconRefresh />}
            loading={loading}
            onClick={handleRefresh}
            theme="borderless"
          >
            {t('刷新')}
          </Button>
        </Space>
      </div>

      {announcements.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Empty
            image={<IconBulb size="extra-large" />}
            description={
              <div>
                <Text type="tertiary">{t('暂无公告')}</Text>
                <br />
                <Text size="small" type="tertiary">
                  {t('系统公告将在这里显示')}
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <div>
          <div className='mb-3'>
            <Text type="tertiary" size="small">
              {t('共 {{count}} 条公告', { count: announcements.length })}
            </Text>
          </div>
          
          <List
            dataSource={announcements}
            renderItem={renderAnnouncementItem}
            style={{ 
              background: 'transparent'
            }}
          />
        </div>
      )}

      <style jsx>{`
        .announcement-content :global(a) {
          color: #1890ff;
          text-decoration: none;
        }
        .announcement-content :global(a:hover) {
          text-decoration: underline;
        }
        .announcement-content :global(strong) {
          font-weight: 600;
        }
        .announcement-content :global(em) {
          font-style: italic;
        }
        .announcement-content :global(p) {
          margin: 8px 0;
        }
        .announcement-content :global(ul), 
        .announcement-content :global(ol) {
          margin: 8px 0;
          padding-left: 20px;
        }
      `}</style>
    </div>
  );
}