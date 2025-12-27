/**
 * 图片资源统一管理
 * 使用import方式确保图片被正确打包到生产环境
 */

// 糖博士头像 - 从src/assets导入，Vite会自动处理并生成带hash的文件名
import drSugarAvatar from './images/dr-sugar-avatar.jpg';

export const images = {
  drSugarAvatar,
};

export default images;
