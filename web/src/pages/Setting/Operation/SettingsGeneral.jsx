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

import { Banner, Button, Col, Form, Modal, Row, Spin } from '@douyinfe/semi-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    API,
    compareObjects,
    showError,
    showSuccess,
    showWarning,
} from '../../../helpers';

export default function GeneralSettings(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);
  const [inputs, setInputs] = useState({
    TopUpLink: '',
    'general_setting.docs_link': '',
    QuotaPerUnit: '',
    RetryTimes: '',
    USDExchangeRate: '',
    DisplayInCurrencyEnabled: false,
    DisplayTokenStatEnabled: false,
    DefaultCollapseSidebar: false,
    DemoSiteEnabled: false,
    SelfUseModeEnabled: false,
    CheckinMinReward: '',
    CheckinMaxReward: '',
    CheckinStreakBonus: '',
    CheckinEnabled: false,
    UIBlurGlassEnabled: false,
    UIBlurGlassStrength: '',
    UIBlurGlassArea: 'both',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
  const updateArray = compareObjects(inputsRow, inputs);
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
        // 保存成功后，将当前 inputs 复制为新的基线，避免再次提示“未修改”
        setInputsRow(structuredClone(inputs));
        props.refresh();
        // 即时刷新本地 blur 状态
        if(updateArray.some(i=>['UIBlurGlassEnabled','UIBlurGlassStrength','UIBlurGlassArea'].includes(i.key))){
          try {
            if('UIBlurGlassEnabled' in inputs) localStorage.setItem('UIBlurGlassEnabled', String(inputs.UIBlurGlassEnabled));
            if('UIBlurGlassStrength' in inputs) localStorage.setItem('UIBlurGlassStrength', String(inputs.UIBlurGlassStrength));
            if('UIBlurGlassArea' in inputs) localStorage.setItem('UIBlurGlassArea', String(inputs.UIBlurGlassArea));
            window.dispatchEvent(new Event('ui-option-update'));
          } catch{}
        }
        // 同步签到开关到本地（用于前端模块显示控制）
        if(updateArray.some(i=>i.key==='CheckinEnabled')){
          try { localStorage.setItem('CheckinEnabled', String(inputs.CheckinEnabled)); } catch{}
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
    const template = { ...inputs };
    const optionKeys = Object.keys(template);
    const filled = {};
    optionKeys.forEach(k=>{
      if(k in props.options){
        filled[k] = props.options[k];
      } else {
        filled[k] = template[k];
      }
    });
    setInputs(filled);
    setInputsRow(structuredClone(filled));
    if(refForm.current){ refForm.current.setValues(filled); }
  }, [props.options]);

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('通用设置')}>
            <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Input
                    field={'CheckinMinReward'}
                    label={t('签到最小奖励')}
                    placeholder={t('签到最小奖励')}
                    onChange={handleFieldChange('CheckinMinReward')}
                    showClear
                  />
                </Col>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Input
                    field={'CheckinMaxReward'}
                    label={t('签到最大奖励')}
                    placeholder={t('签到最大奖励')}
                    onChange={handleFieldChange('CheckinMaxReward')}
                    showClear
                  />
                </Col>
                <Col xs={24} sm={24} md={8} lg={8} xl={8}>
                  <Form.Input
                    field={'CheckinStreakBonus'}
                    label={t('签到加成配置')}
                    placeholder={t('格式：天数=加成百分比，多条以逗号分隔，如 3=10,7=20')}
                    onChange={handleFieldChange('CheckinStreakBonus')}
                    showClear
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Switch
                    field={'CheckinEnabled'}
                    label={t('签到功能开关')}
                    extraText={t('开启后用户可在控制台每日签到领取随机额度奖励')}
                    size='default'
                    checkedText='｜'
                    uncheckedText='〇'
                    onChange={handleFieldChange('CheckinEnabled')}
                  />
                </Col>
              </Row>
              <Row>
                <Button size='default' onClick={onSubmit} style={{marginTop:8}}>
                  {t('保存签到设置')}
                </Button>
              </Row>
              <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'TopUpLink'}
                  label={t('充值链接')}
                  initValue={''}
                  placeholder={t('例如发卡网站的购买链接')}
                  onChange={handleFieldChange('TopUpLink')}
                  showClear
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'general_setting.docs_link'}
                  label={t('文档地址')}
                  initValue={''}
                  placeholder={t('例如 https://docs.newapi.pro')}
                  onChange={handleFieldChange('general_setting.docs_link')}
                  showClear
                />
              </Col>
              {inputs.QuotaPerUnit !== '500000' && inputs.QuotaPerUnit !== 500000 && (
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Input
                    field={'QuotaPerUnit'}
                    label={t('单位美元额度')}
                    initValue={''}
                    placeholder={t('一单位货币能兑换的额度')}
                    onChange={handleFieldChange('QuotaPerUnit')}
                    showClear
                    onClick={() => setShowQuotaWarning(true)}
                  />
                </Col>
              )}
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'USDExchangeRate'}
                  label={t('美元汇率（非充值汇率，仅用于定价页面换算）')}
                  initValue={''}
                  placeholder={t('美元汇率')}
                  onChange={handleFieldChange('USDExchangeRate')}
                  showClear
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'RetryTimes'}
                  label={t('失败重试次数')}
                  initValue={''}
                  placeholder={t('失败重试次数')}
                  onChange={handleFieldChange('RetryTimes')}
                  showClear
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'DisplayInCurrencyEnabled'}
                  label={t('以货币形式显示额度')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('DisplayInCurrencyEnabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'DisplayTokenStatEnabled'}
                  label={t('额度查询接口返回令牌额度而非用户额度')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('DisplayTokenStatEnabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'DefaultCollapseSidebar'}
                  label={t('默认折叠侧边栏')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('DefaultCollapseSidebar')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'UIBlurGlassEnabled'}
                  label={t('启用毛玻璃界面样式')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('UIBlurGlassEnabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'UIBlurGlassStrength'}
                  label={t('毛玻璃模糊强度(px)')}
                  placeholder={t('建议 6 - 24，越大越模糊与耗性能')}
                  onChange={handleFieldChange('UIBlurGlassStrength')}
                  showClear
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Select
                  field={'UIBlurGlassArea'}
                  label={t('毛玻璃作用区域')}
                  placeholder={t('选择作用范围')}
                  optionList={[
                    {label:t('顶部与侧边'), value:'both'},
                    {label:t('仅顶部'), value:'header'},
                    {label:t('仅侧边'), value:'sidebar'},
                    {label:t('不应用'), value:'none'},
                  ]}
                  onChange={handleFieldChange('UIBlurGlassArea')}
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'DemoSiteEnabled'}
                  label={t('演示站点模式')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('DemoSiteEnabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'SelfUseModeEnabled'}
                  label={t('自用模式')}
                  extraText={t('开启后不限制：必须设置模型倍率')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('SelfUseModeEnabled')}
                />
              </Col>
            </Row>
            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存通用设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>

      <Modal
        title={t('警告')}
        visible={showQuotaWarning}
        onOk={() => setShowQuotaWarning(false)}
        onCancel={() => setShowQuotaWarning(false)}
        closeOnEsc={true}
        width={500}
      >
        <Banner
          type='warning'
          description={t(
            '此设置用于系统内部计算，默认值500000是为了精确到6位小数点设计，不推荐修改。',
          )}
          bordered
          fullMode={false}
          closeIcon={null}
        />
      </Modal>
    </>
  );
}
