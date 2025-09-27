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

export default function ConsoleSection({ title, description, children, action }) {
  return (
    <section className='console-section'>
      {(title || description || action) && (
        <header className='console-section__head'>
          <div className='console-section__titles'>
            {title && <h2 className='console-section__title'>{title}</h2>}
            {description && (
              <p className='console-section__desc'>{description}</p>
            )}
          </div>
          {action && <div className='console-section__action'>{action}</div>}
        </header>
      )}
      <div className='console-section__body'>{children}</div>
    </section>
  );
}
