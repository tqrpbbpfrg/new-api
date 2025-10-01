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

import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/User';
import {
    API,
    setUserData,
    showError,
    showSuccess,
    updateAPI,
} from '../../helpers';
import Loading from '../common/ui/Loading';

const OAuth2Callback = (props) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();

  // 最大重试次数
  const MAX_RETRIES = 3;

  const sendCode = async (code, state, retry = 0) => {
    try {
      const { data: resData } = await API.get(
        `/api/oauth/${props.type}?code=${code}&state=${state}`,
      );

      const { success, message, data } = resData;

      if (!success) {
        throw new Error(message || t('授权失败'));
      }

      if (message === 'bind') {
        showSuccess(t('绑定成功！'));
        navigate('/console/personal');
      } else {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        setUserData(data);
        updateAPI();
        showSuccess(t('登录成功！'));
        navigate('/console');
      }
    } catch (error) {
      if (retry < MAX_RETRIES) {
        // 递增的退避等待
        await new Promise((resolve) => setTimeout(resolve, (retry + 1) * 2000));
        return sendCode(code, state, retry + 1);
      }

      // 重试次数耗尽，提示错误
      let errorMsg = t('授权失败');
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // 针对不同OAuth提供商的特定错误处理
      if (props.type === 'discord') {
        if (errorMsg.includes('state') || errorMsg.includes('状态')) {
          errorMsg = 'Discord 授权状态验证失败，请重新登录';
        } else if (errorMsg.includes('code') || errorMsg.includes('授权码')) {
          errorMsg = 'Discord 授权码无效，请重新授权';
        } else if (errorMsg.includes('Token') || errorMsg.includes('Client') || errorMsg.includes('配置')) {
          errorMsg = 'Discord 配置错误，请联系管理员检查 Client ID 和 Client Secret';
        } else if (errorMsg.includes('过期')) {
          errorMsg = 'Discord 授权已过期，请重新尝试登录';
        } else if (errorMsg.includes('注册')) {
          errorMsg = '管理员关闭了新用户注册，请联系管理员';
        } else if (errorMsg.includes('封禁')) {
          errorMsg = '您的账户已被封禁，请联系管理员';
        }
      } else if (props.type === 'github') {
        if (errorMsg.includes('state')) {
          errorMsg = 'GitHub 授权状态验证失败，请重新登录';
        } else if (errorMsg.includes('code')) {
          errorMsg = 'GitHub 授权码无效，请重新授权';
        }
      } else if (props.type === 'oidc') {
        if (errorMsg.includes('state')) {
          errorMsg = 'OIDC 授权状态验证失败，请重新登录';
        }
      }
      
      showError(errorMsg);
      
      // 如果是从登录页面来的，返回登录页
      // 否则返回个人设置页面
      const from = sessionStorage.getItem('oauth_from') || 'login';
      sessionStorage.removeItem('oauth_from');
      
      // 延迟跳转，让用户看到错误信息
      setTimeout(() => {
        navigate(from === 'personal' ? '/console/personal' : '/login');
      }, 2000);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // 参数缺失直接返回
    if (!code) {
      showError(t('未获取到授权码'));
      navigate('/console/personal');
      return;
    }

    sendCode(code, state);
  }, []);

  return <Loading />;
};

export default OAuth2Callback;
