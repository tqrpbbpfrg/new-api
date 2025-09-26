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

import { IconBulb, IconCalendar, IconPin, IconRefresh, IconSearch } from '@douyinfe/semi-icons';
import { Button, Card, Empty, Input, List, Space, Spin, Tag, Typography } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnread } from '../../../context/Unread';
import { isAdmin } from '../../../helpers';
import { addAnnouncementsAsRead } from '../../../helpers/announcementRead';
import { highlight, sanitizeHTML } from '../../../helpers/sanitize';
import { useAnnouncements } from '../../../hooks/message/useAnnouncements';

const { Title, Text, Paragraph } = Typography;

/**
 * 公告板：
 *  - 支持置顶公告 (/api/notice)
 *  - 支持外部传入公告数据以避免重复请求
 *  - 进入后延迟（3s 或用户滚动）自动标记已读，保留用户初始未读统计用于 Tab 上展示
 */
export default function AnnouncementBoard({ announcementsProp, refreshProp }) {
  const { t } = useTranslation();
  const admin = isAdmin();
  const [loading, setLoading] = useState(false);
  const internalHook = useAnnouncements();
  const announcementsRaw = announcementsProp || internalHook.items;
  const refresh = refreshProp || internalHook.refresh;
  const [topNotice, setTopNotice] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [topLoading, setTopLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // fetch /api/notice as a pinned top notice
  useEffect(() => {
    const fetchTopNotice = async () => {
      setTopLoading(true);
      try {
        const res = await fetch('/api/notice');
        const data = await res.json();
        if (data.success && data.data && data.data.trim() !== '') {
          setTopNotice({
            id: 'top-notice',
            content: data.data,
            date: new Date().toISOString(),
            pinned: true,
          });
        } else {
          setTopNotice(null);
        }
      } catch (_) {
        setTopNotice(null);
      } finally {
        setTopLoading(false);
      }
    };
    fetchTopNotice();
  }, []);

  // combine pinned notice + announcements list
  useEffect(() => {
    const list = [...announcementsRaw];
    if (topNotice) {
      // 避免重复内容简单判断前30字符
      const dupIdx = list.findIndex(a => (a.content||'').slice(0,30) === topNotice.content.slice(0,30));
      if (dupIdx !== -1) list.splice(dupIdx,1);
      list.unshift(topNotice);
    }
    // sanitize
    const safeList = list.map(a => ({
      ...a,
      content: sanitizeHTML(a.content||'')
    }));
    setAnnouncements(safeList);
  }, [announcementsRaw, topNotice]);

  // 延迟标记已读逻辑
  const containerRef = useRef(null);
  useEffect(() => {
    if (!announcements || announcements.length === 0) return;
    // 3 秒延迟 + 滚动任一触发标记已读
    let timeout = setTimeout(() => markRead(), 3000);
    const el = containerRef.current;
    const onScroll = () => {
      if (!el) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
      if (nearBottom) {
        markRead();
      }
    };
    if (el) el.addEventListener('scroll', onScroll);
    return () => {
      clearTimeout(timeout);
      if (el) el.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements]);

  const markRead = () => {
    if (!announcements || announcements.length === 0) return;
    addAnnouncementsAsRead(announcements);
    // 通知外部刷新未读展示
    window.dispatchEvent(new CustomEvent('announcements-marked-read'));
    // 强制 Provider 校准（避免 60s TTL 延迟）
    try { const { refresh } = useUnread() || {}; refresh && refresh({ force:true }); } catch(_) {}
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(()=>{
    if(!keyword) return announcements;
    const k = keyword.toLowerCase();
    return announcements.filter(a => (a.content||'').toLowerCase().includes(k));
  },[announcements, keyword]);

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
              <Text strong>{announcement.pinned ? t('置顶公告') : t('系统公告')}</Text>
              {isRecent && (
                <Tag color="red" size="small">
                  {t('新')}
                </Tag>
              )}
              {announcement.pinned && (
                <Tag color="orange" size="small" type="light">
                  <IconPin size="small" />
                  {t('置顶')}
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
            dangerouslySetInnerHTML={{ __html: highlight(announcement.content, keyword) }}
            style={{ lineHeight:'1.6', fontSize:'14px', color:'#666' }}
          />
        </div>
      </List.Item>
    );
  };

  return (
  <div ref={containerRef} className='space-y-4' style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
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

      <div className='flex justify-between items-center gap-3'>
        <Input
          prefix={<IconSearch />}
          placeholder={t('搜索公告内容')}
          value={keyword}
          onChange={setKeyword}
          showClear
          style={{ maxWidth: 280 }}
          size='small'
        />
        {keyword && (
          <Text size='small' type='tertiary'>
            {t('匹配到 {{count}} 条', { count: filtered.length })}
          </Text>
        )}
      </div>

      {(topLoading && filtered.length === 0) ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spin size='large'>Loading</Spin>
        </Card>
      ) : filtered.length === 0 ? (
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
            dataSource={filtered}
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