import { CanvasAddon } from '@xterm/addon-canvas';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
// import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import clsx from 'clsx';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { useTheme } from '@/hooks/use-theme';

export type XTermRef = {
  write: (
    ...args: Parameters<Terminal['write']>
  ) => ReturnType<Terminal['write']>;
  writeAsync: (data: Parameters<Terminal['write']>[0]) => Promise<void>;
  writeln: (
    ...args: Parameters<Terminal['writeln']>
  ) => ReturnType<Terminal['writeln']>;
  writelnAsync: (data: Parameters<Terminal['writeln']>[0]) => Promise<void>;
  clear: () => void;
  terminalRef: React.RefObject<Terminal | null>;
};

export interface XTermProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onInput' | 'onResize'> {
  onInput?: (data: string) => void;
  onKey?: (key: string, event: KeyboardEvent) => void;
  onResize?: (cols: number, rows: number) => void; // 新增属性
}

const XTerm = forwardRef<XTermRef, XTermProps>((props, ref) => {
  const domRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const { className, onInput, onKey, onResize, ...rest } = props;
  const { theme } = useTheme();
  useEffect(() => {
    // 根据屏幕宽度决定字体大小，手机端使用更小的字体
    const width = window.innerWidth;
    // 按屏幕宽度自适应字体大小
    let fontSize = 16;
    if (width < 400) {
      fontSize = 4;
    } else if (width < 600) {
      fontSize = 5;
    } else if (width < 900) {
      fontSize = 6;
    } else if (width < 1280) {
      fontSize = 12;
    } // ≥1280: 16

    const terminal = new Terminal({
      allowTransparency: true,
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "JetBrains Mono", monospace',
      cursorInactiveStyle: 'outline',
      drawBoldTextInBrightColors: false,
      fontSize,
      lineHeight: 1.2,
    });
    terminalRef.current = terminal;
    const fitAddon = new FitAddon();
    terminal.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (event.ctrlKey || event.metaKey) {
          window.open(uri, '_blank');
        }
      })
    );
    terminal.loadAddon(fitAddon);
    terminal.open(domRef.current!);

    // 所有端都使用 Canvas 渲染器（包括手机端）
    terminal.loadAddon(new CanvasAddon());
    terminal.onData((data) => {
      if (onInput) {
        onInput(data);
      }
    });

    terminal.onKey((event) => {
      if (onKey) {
        onKey(event.key, event.domEvent);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      // 获取当前终端尺寸
      const cols = terminal.cols;
      const rows = terminal.rows;
      if (onResize) {
        onResize(cols, rows);
      }
    });

    // 字体加载完成后重新调整终端大小
    document.fonts.ready.then(() => {
      fitAddon.fit();

      resizeObserver.observe(domRef.current!);
    });

    return () => {
      resizeObserver.disconnect();
      setTimeout(() => {
        terminal.dispose();
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      if (theme === 'dark') {
        terminalRef.current.options.theme = {
          background: '#00000000',
          black: '#ffffff',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
          foreground: '#cccccc',
          selectionBackground: '#3a3d41',
          cursor: '#ffffff',
        };
      } else {
        // 终端始终使用深色面板：白字日志在白底上不可读
        terminalRef.current.options.theme = {
          background: '#00000000',
          black: '#1b1b22',
          red: '#f07178',
          green: '#7fd88f',
          yellow: '#ffcb6b',
          blue: '#82aaff',
          magenta: '#c792ea',
          cyan: '#89ddff',
          white: '#d0d0d6',
          brightBlack: '#7a7a86',
          brightRed: '#ff8b92',
          brightGreen: '#a5e8b4',
          brightYellow: '#ffe0a3',
          brightBlue: '#a8c4ff',
          brightMagenta: '#e2b9ff',
          brightCyan: '#b5ecff',
          brightWhite: '#f5f5fa',
          foreground: '#d0d0d6',
          selectionBackground: 'rgba(255,127,172,0.35)',
          cursor: '#ff7fac',
        };
      }
      // Canvas 渲染下更新 theme 不会自动重绘已有内容，手动刷新一次
      try {
        terminalRef.current.refresh(0, terminalRef.current.rows - 1);
      } catch {
        /* 终端尚未就绪时忽略 */
      }
    }
  }, [theme]);

  useImperativeHandle(
    ref,
    () => ({
      write: (...args) => {
        return terminalRef.current?.write(...args);
      },
      writeAsync: async (data) => {
        return new Promise((resolve) => {
          terminalRef.current?.write(data, resolve);
        });
      },
      writeln: (...args) => {
        return terminalRef.current?.writeln(...args);
      },
      writelnAsync: async (data) => {
        return new Promise((resolve) => {
          terminalRef.current?.writeln(data, resolve);
        });
      },
      clear: () => {
        terminalRef.current?.clear();
      },
      terminalRef,
    }),
    []
  );

  return (
    <div
      className={clsx(
        'p-2.5 rounded-2xl border w-full h-full overflow-hidden backdrop-blur-sm transition-colors',
        theme === 'dark'
          ? 'bg-[#0d0d11] border-white/10'
          : 'bg-[#16161c] border-black/20',
        className
      )}
      {...rest}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
        }}
        ref={domRef}
      />
    </div>
  );
});

export default XTerm;
