import { Share, Linking, Platform } from 'react-native';

class ShareHelper {
  /**
   * Share content via native sharing dialog
   * @param {object} options - Share options {title, message, url}
   */
  static async shareContent(options) {
    try {
      const { title, message, url } = options;
      
      const shareOptions = {
        title: title || 'Share via',
        message: message ? `${message} ${url}` : url,
        url: url, // iOS specific
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  }

  /**
   * Generate and share a deep link
   * @param {string} path - The deep link path (e.g., '/product/123')
   * @param {object} params - Additional query parameters
   */
  static async shareDeepLink(path, params = {}) {
    try {
      // Construct your deep link URL
      const baseUrl = Platform.OS === 'ios' 
        ? 'koleso.app://' 
        : 'https://koleso.app/';
      
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const fullUrl = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
      
      await this.shareContent({
        message: 'Check this out in our app!',
        url: fullUrl,
      });
    } catch (error) {
      console.error('Error sharing deep link:', error);
    }
  }
}

export default ShareHelper;