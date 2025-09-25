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

import React from 'react';

class SafeActionButtonsWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    // Specifically handle React error #310 (hook order issues)
    if (error.message && error.message.includes('310')) {
      return { hasError: true };
    }
    // Re-throw other errors to be handled by parent error boundaries
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ActionButtons hook error caught:', error.message);
    // Auto-retry once after a short delay for transient hook issues
    if (this.state.retryCount < 1) {
      setTimeout(() => {
        this.setState({ 
          hasError: false, 
          retryCount: this.state.retryCount + 1 
        });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render a minimal fallback that doesn't use problematic hooks
      return (
        <div className='flex items-center gap-2 md:gap-3'>
          <div className="w-8 h-8 flex items-center justify-center">
            {/* Simple notification icon without unread count */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 6H15L13.5 7.5C13.1 7.9 12.6 8.1 12 8.1S10.9 7.9 10.5 7.5L9 6H3C2.4 6 2 6.4 2 7S2.4 8 3 8H21C21.6 8 22 7.6 22 7S21.6 6 21 6Z"/>
            </svg>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeActionButtonsWrapper;