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

import { IconRefresh, IconTick } from '@douyinfe/semi-icons';
import { Button, Card, Space, Toast, Typography } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { API } from '../../helpers';

const { Text, Title } = Typography;

const HeaderNavFixer = () => {
  const [loading, setLoading] = useState(false);
  const [fixed, setFixed] = useState(false);

  const fixHeaderNav = async () => {
    setLoading(true);
    try {
      // 获取当前配置
      const response = await API.get('/api/option/');
      const { success, data } = response.data;
      
      if (success) {
        const headerNavOption = data.find(opt => opt.key === 'HeaderNavModules');
        
        // 检查是否需要修复
        let needsFix = false;
        if (!headerNavOption || 
            !headerNavOption.value || 
            headerNavOption.value === '' ||
            headerNavOption.value === '{}' ||
            headerNavOption.value === 'null') {
          needsFix = true;
        } else {
          try {
            const parsed = JSON.parse(headerNavOption.value);
            if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
              needsFix = true;
            }
          } catch (e) {
            needsFix = true;
          }
        }

        if (needsFix) {
          // 设置默认配置 - 与useHeaderBar.js中的defaultConfig保持一致
          const defaultConfig = {
            home: true,
            console: true,
            pricing: {
              enabled: true,
              requireAuth: false
            },
            docs: true,
            about: true
          };

          const updateResponse = await API.put('/api/option/', {
            options: [{
              key: 'HeaderNavModules',
              value: JSON.stringify(defaultConfig)
            }]
          });

          if (updateResponse.data.success) {
            Toast.success('顶栏导航配置已修复');
            setFixed(true);
            // 刷新页面以应用新配置
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            Toast.error('修复失败：' + updateResponse.data.message);
          }
        } else {
          Toast.info('顶栏导航配置正常，无需修复');
          setFixed(true);
        }
      } else {
        Toast.error('获取配置失败');
      }
    } catch (error) {
      Toast.error('修复过程中发生错误：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ margin: '16px 0' }}>
      <div style={{ textAlign: 'center' }}>
        <Title heading={4} style={{ marginBottom: '8px' }}>
          🔧 顶栏导航修复工具
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          如果顶栏导航不显示，点击下面的按钮进行修复
        </Text>
        <Space>
          <Button
            type="primary"
            loading={loading}
            onClick={fixHeaderNav}
            icon={fixed ? <IconTick /> : <IconRefresh />}
            disabled={fixed}
          >
            {fixed ? '已修复' : '修复顶栏导航'}
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default HeaderNavFixer;