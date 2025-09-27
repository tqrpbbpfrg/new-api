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

import UsersTable from '../../components/table/users';
import ConsoleSection from '../../components/layout/ConsoleSection';

const User = () => (
  <div className='px-2'>
    <ConsoleSection
      title='用户管理'
      description='查看与管理系统中的用户账号、权限与状态。'
    >
      <div className='card-grid'>
        <div className='col-span-full'>
          <UsersTable />
        </div>
      </div>
    </ConsoleSection>
  </div>
);

export default User;
