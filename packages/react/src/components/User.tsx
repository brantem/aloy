import { useEffect, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

import type { User } from 'types/external';
import { useUserStore } from 'lib/stores/user';
import { cn } from 'lib/helpers';

type UserProps = {
  onChange(user: User): void;
};

export default function User({ onChange }: UserProps) {
  const user = useUserStore((state) => state.user);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(() => user?.name || '');

  useEffect(() => {
    if (!user) setIsOpen(true);
  }, []);

  return (
    <>
      {user && (
        <div className="fixed right-4 top-4 z-20">
          <button
            className={cn(
              'group relative flex size-7 items-center justify-center rounded-full bg-black px-2.5 text-white shadow-xl dark:bg-white dark:text-black',
              isOpen ? 'w-fit text-sm font-normal' : 'font-bold hover:w-fit hover:text-sm hover:font-normal',
            )}
            onClick={() => setIsOpen(true)}
          >
            <span className={isOpen ? 'hidden' : 'group-hover:hidden'}>{user.name[0]}</span>
            <span className={isOpen ? undefined : 'hidden group-hover:inline'}>{name || user.name}</span>
          </button>
        </div>
      )}

      <Dialog
        open={isOpen}
        className="relative z-20 focus:outline-none lg:z-10"
        onClose={() => {
          if (!user) return;
          setIsOpen(false);
        }}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 backdrop-blur-sm duration-300 ease-out data-[closed]:opacity-0 lg:backdrop-blur-md"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center lg:items-center lg:p-6">
            <DialogPanel
              transition
              className={cn(
                'relative w-full max-w-sm rounded-xl bg-white p-6 text-neutral-950 ease-out',
                'duration-300 data-[closed]:translate-y-full',
                'max-lg:rounded-b-none lg:data-[closed]:translate-y-8 lg:data-[closed]:opacity-0',
              )}
            >
              <DialogTitle as="h3" className="text-lg font-bold">
                What should I call you?
              </DialogTitle>

              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onChange({
                    id: user?.id || Date.now().toString(),
                    name: name.trim(),
                  });
                  setIsOpen(false);
                }}
              >
                <input
                  type="text"
                  className="h-10 flex-1 rounded-md bg-neutral-100 px-3 py-2"
                  placeholder="Jeff"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-neutral-950 px-4 font-medium text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                  disabled={name.trim() === ''}
                >
                  Save
                </button>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
