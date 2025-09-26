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

import { IconActivity, IconBulb, IconMail } from '@douyinfe/semi-icons';
import { Badge, Card, Space, Tabs, Typography } from '@douyinfe/semi-ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnread } from '../../context/Unread';
import { isAdmin } from '../../helpers';
import { useAnnouncements } from '../../hooks/message/useAnnouncements';
import { useMessageRealtime } from '../../hooks/message/useRealtime';
import AdminAnalytics from './components/AdminAnalytics';
import AnnouncementBoard from './components/AnnouncementBoard';
import { InboxList, SentList } from './components/MessageList';
import MessageThread from './components/MessageThread';
import SendPanel from './components/SendPanel';

const { Title } = Typography;

export default function InfoCenter(){
  const { t } = useTranslation();
  const admin = isAdmin();
  const [activeMessage, setActiveMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('announcements');
  
  const announcementsHook = useAnnouncements();
  const { messages:inboxUnread, announcements:announcementUnread } = useUnread() || { messages:0, announcements:0 };

  const handleIncoming = useCallback((msg) => {
    if (activeTab === 'inbox' && msg) {
      window.dispatchEvent(new CustomEvent('inbox-incremental', { 
        detail: {
          id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          subject: msg.subject,
          content: msg.content,
          reply_to: msg.reply_to,
          created_at: msg.created_at,
          is_read: false,
          is_broadcast: msg.is_broadcast,
        }
      }));
    }
  }, [activeTab]);

  useMessageRealtime({ onMessage: handleIncoming });

  return (
    <div className='p-4' style={{ background: '#f6f7f9', minHeight: '100vh' }}>
      <div className='mb-4'>
        <Title heading={3} style={{ marginBottom: 8 }}>
          <IconBulb style={{ marginRight: 8 }} />
          {t('信息处')}
        </Title>
        <Typography.Text type="tertiary">{t('系统公告与消息中心')}</Typography.Text>
      </div>

      <Card style={{ minHeight: 'calc(100vh - 180px)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => { 
            setActiveTab(key); 
            setActiveMessage(null); 
          }} 
          type='line'
          size="large"
        >
          {/* 公告板 */}
          <Tabs.TabPane 
            tab={
              <Space>
                <IconBulb />
                {t('公告板')}
                {announcementUnread>0 && (
                  <Badge count={announcementUnread} type='danger' style={{ transform:'scale(0.85)', marginLeft:4 }}>
                    <span />
                  </Badge>
                )}
              </Space>
            } 
            itemKey='announcements'
          >
            <AnnouncementBoard announcementsProp={announcementsHook.items} refreshProp={announcementsHook.refresh} />
          </Tabs.TabPane>

          {/* 邮箱 - 收件箱 */}
          <Tabs.TabPane 
            tab={
              <Space>
                <IconMail />
                {t('收件箱')}
                {inboxUnread>0 && (
                  <Badge count={inboxUnread} type='danger' style={{ transform:'scale(0.85)', marginLeft:4 }}>
                    <span />
                  </Badge>
                )}
              </Space>
            } 
            itemKey='inbox'
          >
            <div className='grid gap-4' style={{ gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 280px)' }}>
              <div className='space-y-4'>
                <InboxList onSelect={(m) => setActiveMessage(m)} />
                <SendPanel 
                  replyTo={activeMessage && !activeMessage.is_broadcast ? activeMessage.id : null} 
                  onSent={() => {}} 
                />
              </div>
              <div className='border rounded-md overflow-hidden'>
                <MessageThread messageId={activeMessage?.id} />
              </div>
            </div>
          </Tabs.TabPane>

          {/* 管理员专用 - 已发送 */}
          {admin && (
            <Tabs.TabPane 
              tab={
                <Space>
                  <IconMail />
                  {t('已发送')}
                </Space>
              } 
              itemKey='sent'
            >
              <div className='grid gap-4' style={{ gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 280px)' }}>
                <div className='space-y-4'>
                  <SentList onSelect={(m) => setActiveMessage(m)} />
                </div>
                <div className='border rounded-md overflow-hidden'>
                  <MessageThread messageId={activeMessage?.id} />
                </div>
              </div>
            </Tabs.TabPane>
          )}

          {/* 管理员专用 - 统计 */}
          {admin && (
            <Tabs.TabPane 
              tab={
                <Space>
                  <IconActivity />
                  {t('消息统计')}
                </Space>
              } 
              itemKey='analytics'
            >
              <AdminAnalytics />
            </Tabs.TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
}
