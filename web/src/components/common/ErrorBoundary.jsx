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

import { Banner, Button, Card } from '@douyinfe/semi-ui';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force a page reload to reset the app state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg">
            <Banner
              fullMode={false}
              type="danger"
              title="页面渲染出错"
              description="页面渲染时遇到错误，可能是由于网络问题或浏览器兼容性导致。"
            />
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                如果问题持续存在，请尝试以下解决方案：
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>清理浏览器缓存和 Cookie</li>
                <li>使用无痕模式访问</li>
                <li>切换到其他浏览器</li>
                <li>检查网络连接状态</li>
              </ul>
              <div className="pt-4">
                <Button 
                  type="primary" 
                  onClick={this.handleReset}
                  className="mr-2"
                >
                  重新加载页面
                </Button>
                <Button 
                  onClick={() => window.location.href = '/login'}
                >
                  返回登录页
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    开发模式错误详情 (点击展开)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {'\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;