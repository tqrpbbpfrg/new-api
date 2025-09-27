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

import { useMemo } from 'react';

export const useNavigation = (t, docsLink, headerNavModules) => {
  const mainNavLinks = useMemo(() => {
    // 添加调试信息
    console.log('useNavigation - headerNavModules:', headerNavModules);
    console.log('useNavigation - docsLink:', docsLink);

    // 默认配置，确保在没有传入配置或配置为空时也能正常显示
    const defaultModules = {
      home: true,
      console: true,
      pricing: true,
      docs: true,
      about: true,
    };

    // 使用传入的配置或默认配置，确保不为null/undefined
    const modules =
      headerNavModules && typeof headerNavModules === 'object'
        ? headerNavModules
        : defaultModules;

    console.log('useNavigation - final modules:', modules);

    const allLinks = [
      {
        text: t('首页'),
        itemKey: 'home',
        to: '/',
      },
      {
        text: t('控制台'),
        itemKey: 'console',
        to: '/console',
      },
      {
        text: t('模型广场'),
        itemKey: 'pricing',
        to: '/pricing',
      },
      ...(docsLink
        ? [
            {
              text: t('文档'),
              itemKey: 'docs',
              isExternal: true,
              externalLink: docsLink,
            },
          ]
        : []),
      {
        text: t('关于'),
        itemKey: 'about',
        to: '/about',
      },
    ];

    // 根据配置过滤导航链接
    const filteredLinks = allLinks.filter((link) => {
      if (link.itemKey === 'docs') {
        const result = docsLink && modules.docs;
        console.log(
          `useNavigation - ${link.itemKey}: docsLink=${docsLink}, modules.docs=${modules.docs}, result=${result}`,
        );
        return result;
      }
      if (link.itemKey === 'pricing') {
        // 支持新的pricing配置格式
        const result =
          typeof modules.pricing === 'object'
            ? modules.pricing.enabled
            : modules.pricing;
        console.log(
          `useNavigation - ${link.itemKey}: modules.pricing=${JSON.stringify(modules.pricing)}, result=${result}`,
        );
        return result;
      }
      const result = modules[link.itemKey] === true;
      console.log(
        `useNavigation - ${link.itemKey}: modules[${link.itemKey}]=${modules[link.itemKey]}, result=${result}`,
      );
      return result;
    });

    console.log('useNavigation - filteredLinks:', filteredLinks);
    return filteredLinks;
  }, [t, docsLink, headerNavModules]);

  return {
    mainNavLinks,
  };
};
