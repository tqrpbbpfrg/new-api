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

import { API, showError } from '../helpers';

/**
 * 签到相关API服务
 */
export class CheckInService {
  /**
   * 获取签到配置
   * @returns {Promise<Object>}
   */
  static async getConfig() {
    try {
      const response = await API.get('/api/checkin/config');
      return response.data;
    } catch (error) {
      showError('获取签到配置失败');
      throw error;
    }
  }

  /**
   * 更新签到配置（管理员）
   * @param {Object} config - 签到配置
   * @returns {Promise<Object>}
   */
  static async updateConfig(config) {
    try {
      const response = await API.put('/api/checkin/config', config);
      return response.data;
    } catch (error) {
      showError('更新签到配置失败');
      throw error;
    }
  }

  /**
   * 获取用户签到状态
   * @returns {Promise<Object>}
   */
  static async getUserStatus() {
    try {
      const response = await API.get('/api/checkin/status');
      return response.data;
    } catch (error) {
      showError('获取签到状态失败');
      throw error;
    }
  }

  /**
   * 获取用户签到历史
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  static async getHistory(page = 1, pageSize = 30) {
    try {
      const response = await API.get('/api/checkin/history', {
        params: { page, pageSize }
      });
      return response.data;
    } catch (error) {
      showError('获取签到历史失败');
      throw error;
    }
  }

  /**
   * 用户签到
   * @param {string} verifyCode - 鉴权码（可选）
   * @returns {Promise<Object>}
   */
  static async checkIn(verifyCode = '') {
    try {
      const response = await API.post('/api/checkin/', { verifyCode });
      return response.data;
    } catch (error) {
      showError('签到失败');
      throw error;
    }
  }

  /**
   * 获取所有签到记录（管理员）
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  static async getAllCheckIns(page = 1, pageSize = 30) {
    try {
      const response = await API.get('/api/checkin/all', {
        params: { page, pageSize }
      });
      return response.data;
    } catch (error) {
      showError('获取签到记录失败');
      throw error;
    }
  }
}
