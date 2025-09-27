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

import { Button, Col, Form, Row, Spin, Tag } from '@douyinfe/semi-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  API,
  compareObjects,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';

export default function SettingsDrawing(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    DrawingEnabled: false,
    MjNotifyEnabled: false,
    MjAccountFilterEnabled: false,
    MjForwardUrlEnabled: false,
    MjModeClearEnabled: false,
    MjActionCheckSuccessEnabled: false,
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
        
        // 同步绘图相关开关到本地存储
        const drawingSwitches = [
          'DrawingEnabled',
          'MjNotifyEnabled',
          'MjAccountFilterEnabled',
          'MjModeClearEnabled',
          'MjForwardUrlEnabled',
          'MjActionCheckSuccessEnabled'
        ];
        
        const hasDrawingUpdates = updateArray.some(i => drawingSwitches.includes(i.key));
        if(hasDrawingUpdates){
          try { 
            // 获取当前缓存
            const cache = localStorage.getItem('options_cache');
            let options = {};
            if(cache) {
              options = JSON.parse(cache);
            }
            
            // 更新所有变更的绘图开关
            drawingSwitches.forEach(key => {
              if(key in inputs) {
                localStorage.setItem(key, String(inputs[key]));
                options[key] = inputs[key];
              }
            });
            
            // 特殊处理：MjNotifyEnabled 还需要存储到 mj_notify_enabled 键
            if('MjNotifyEnabled' in inputs) {
              localStorage.setItem('mj_notify_enabled', String(inputs.MjNotifyEnabled));
            }
            
            // 特殊处理：DrawingEnabled 还需要存储到 enable_drawing 键
            if('DrawingEnabled' in inputs) {
              localStorage.setItem('enable_drawing', String(inputs.DrawingEnabled));
            }
            
            // 更新options_cache
            localStorage.setItem('options_cache', JSON.stringify(options));
            
          } catch(e){
            console.warn('Failed to sync drawing switches to localStorage:', e);
          }
        }
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('绘图设置')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'DrawingEnabled'}
                  label={t('启用绘图功能')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      DrawingEnabled: value,
                    });
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'MjNotifyEnabled'}
                  label={t('允许回调（会泄露服务器 IP 地址）')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      MjNotifyEnabled: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'MjAccountFilterEnabled'}
                  label={t('允许 AccountFilter 参数')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      MjAccountFilterEnabled: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'MjForwardUrlEnabled'}
                  label={t('开启之后将上游地址替换为服务器地址')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      MjForwardUrlEnabled: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'MjModeClearEnabled'}
                  label={
                    <>
                      {t('开启之后会清除用户提示词中的')} <Tag>--fast</Tag> 、
                      <Tag>--relax</Tag> {t('以及')} <Tag>--turbo</Tag>{' '}
                      {t('参数')}
                    </>
                  }
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      MjModeClearEnabled: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'MjActionCheckSuccessEnabled'}
                  label={t('检测必须等待绘图成功才能进行放大等操作')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      MjActionCheckSuccessEnabled: value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存绘图设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
