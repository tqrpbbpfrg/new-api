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

import React, { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Typography,
  Card,
  Select,
  Input,
  Space,
  Tag,
  message,
  Divider,
  Table,
  Modal,
  Popconfirm,
} from '@douyinfe/semi-ui';
const { Text } = Typography;
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const UserExtraGroupManagement = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedExtraGroups, setSelectedExtraGroups] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  const getUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/');
      const { success, data } = res.data;
      if (success) {
        setUsers(data.items || []);
        setFilteredUsers(data.items || []);
      }
    } catch (error) {
      showError(t('获取用户列表失败'));
    }
    setLoading(false);
  };

  const getAvailableGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      const { success, data } = res.data;
      if (success) {
        setAvailableGroups(data);
      }
    } catch (error) {
      console.error('获取可用用户组失败:', error);
    }
  };

  useEffect(() => {
    getUsers();
    getAvailableGroups();
  }, []);

  useEffect(() => {
    // 根据搜索关键词过滤用户
    if (searchKeyword.trim() === '') {
      setFilteredUsers(users);
    } else {
      const keyword = searchKeyword.toLowerCase();
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(keyword) ||
        user.display_name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      );
      setFilteredUsers(filtered);
    }
  }, [searchKeyword, users]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedExtraGroups(user.extra_groups || []);
    setEditModalVisible(true);
  };

  const handleSaveExtraGroups = async () => {
    if (!editingUser) return;

    setLoading(true);
    try {
      const res = await API.put(`/api/user/${editingUser.id}/extra-groups`, {
        extra_groups: selectedExtraGroups
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('额外用户组更新成功'));
        setEditModalVisible(false);
        setEditingUser(null);
        setSelectedExtraGroups([]);
        // 刷新用户列表
        getUsers();
      } else {
        showError(message || t('更新失败'));
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  const handleSearch = (value) => {
    setSearchKeyword(value);
  };

  const columns = [
    {
      title: t('用户名'),
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: t('显示名称'),
      dataIndex: 'display_name',
      key: 'display_name',
      sorter: (a, b) => a.display_name.localeCompare(b.display_name),
    },
    {
      title: t('邮箱'),
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: t('主用户组'),
      dataIndex: 'group',
      key: 'group',
      sorter: (a, b) => a.group.localeCompare(b.group),
      render: (group) => (
        <Tag color="blue" size="small">
          {group}
        </Tag>
      ),
    },
    {
      title: t('额外用户组'),
      dataIndex: 'extra_groups',
      key: 'extra_groups',
      render: (extra_groups) => (
        <Space wrap>
          {extra_groups && extra_groups.length > 0 ? (
            extra_groups.map(group => (
              <Tag key={group} color="purple" size="small">
                {group}
              </Tag>
            ))
          ) : (
            <Tag color="gray" size="small">
              无
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('所有用户组'),
      dataIndex: 'all_groups',
      key: 'all_groups',
      render: (all_groups) => (
        <Space wrap>
          {all_groups && all_groups.length > 0 ? (
            all_groups.map(group => (
              <Tag key={group} color="green" size="small">
                {group}
              </Tag>
            ))
          ) : (
            <Tag color="gray" size="small">
              无
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('操作'),
      key: 'action',
      render: (text, record) => (
        <Button
          size="small"
          onClick={() => handleEditUser(record)}
        >
          {t('管理额外用户组')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('管理用户的额外用户组，用户将同时拥有主用户组和所有额外用户组的权限')}
          </Text>
          
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Input
                placeholder={t('搜索用户名、显示名称或邮箱')}
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                onClick={getUsers}
                loading={loading}
                style={{ float: 'right' }}
              >
                {t('刷新用户列表')}
              </Button>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={t('管理用户额外用户组')}
        visible={editModalVisible}
        onOk={handleSaveExtraGroups}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingUser(null);
          setSelectedExtraGroups([]);
        }}
        confirmLoading={loading}
        width={600}
      >
        {editingUser && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('用户信息')}:</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{t('用户名')}: {editingUser.username}</Text>
              <br />
              <Text>{t('显示名称')}: {editingUser.display_name}</Text>
              <br />
              <Text>{t('主用户组')}: </Text>
              <Tag color="blue" size="small">{editingUser.group}</Tag>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('选择额外用户组')}:</Text>
          <Select
            multiple
            value={selectedExtraGroups}
            onChange={setSelectedExtraGroups}
            placeholder={t('请选择额外用户组')}
            style={{ width: '100%', marginTop: 8 }}
            optionList={availableGroups.map(group => ({
              label: group,
              value: group,
            }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('当前选择的额外用户组')}:</Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {selectedExtraGroups.length > 0 ? (
                selectedExtraGroups.map(group => (
                  <Tag key={group} color="purple" size="small">
                    {group}
                  </Tag>
                ))
              ) : (
                <Tag color="gray" size="small">
                  {t('未选择额外用户组')}
                </Tag>
              )}
            </Space>
          </div>
        </div>

        <Divider />

        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {t('功能说明')}:
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>主用户组：用户的主要用户组，决定基础权限和功能</li>
            <li>额外用户组：用户可以同时拥有的额外用户组，提供额外的权限和功能</li>
            <li>用户将拥有主用户组和所有额外用户组的组合权限</li>
            <li>额外用户组由管理员手动配置，用户注册时不会自动分配</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default UserExtraGroupManagement;
